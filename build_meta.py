#!/usr/bin/env python3
"""Сборка meta.json для Mini App: признаки игроков, команды и журнал изменений настроек.

Использование:
    python build_meta.py ПАПКА_С_ИСТОЧНИКОМ              # обычное еженедельное обновление
    python build_meta.py ПАПКА_С_ИСТОЧНИКОМ --backfill   # разово: восстановить историю из git источника

Источник — клон https://github.com/AntonyPerez0/cs2-pro-configs (MIT).
Файлы рядом со скриптом: teams.json (составы команд, правится вручную),
state.json (прошлый снимок настроек для поиска изменений), meta.json (результат для приложения).
Только стандартная библиотека Python 3.8+.
"""
import json
import re
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
KEEP_DAYS = 180
KEEP_EVENTS = 2000


def jload(p, default=None):
    try:
        return json.loads(Path(p).read_text(encoding="utf-8"))
    except Exception:
        return default


def norm(s):
    return re.sub(r"[^0-9a-zа-яё]+", "", (s or "").lower())


# ------------------------------------------------------------ профиль игрока

def flat(d):
    """Плоский словарь всех настроек игрока для сравнения между снимками."""
    o = {}
    if d.get("crosshair_code"):
        o["code"] = d["crosshair_code"]
    o["launch"] = d.get("launch_options") or ""
    for t, rows in (d.get("tables") or {}).items():
        for k, v in rows.items():
            o[f"{t}.{k}"] = v
    for k, v in (d.get("convars") or {}).items():
        o["cv." + k] = v
    return o


def diff(old, new):
    """Список изменений [ключ, было, стало]. Все изменения старого прицела сворачиваются в одну запись 'xh'."""
    out, xh = [], False
    for k in sorted(set(old) | set(new)):
        a, b = old.get(k), new.get(k)
        if a == b:
            continue
        if k == "code" or k.startswith(("cv.cl_crosshair", "cv.cl_fixedcrosshair")):
            xh = True
            continue
        if k.startswith("cv.setting."):
            continue
        out.append([k, a, b])
    if xh:
        out.insert(0, ["xh", None, None])
    return out


# ------------------------------------------------------------ признаки для поиска/статистики

def num(x):
    try:
        v = float(str(x).replace(",", "."))
        return int(v) if v == int(v) else v
    except Exception:
        return None


def color_name(r, g, b):
    if r is None:
        return "?"
    r, g, b = int(r), int(g), int(b)
    if min(r, g, b) > 215:
        return "белый"
    if max(r, g, b) < 60:
        return "чёрный"
    mx, mn = max(r, g, b), min(r, g, b)
    if mx - mn < 40:
        return "серый"
    # оттенок
    if mx == r:
        h = ((g - b) / (mx - mn)) % 6
    elif mx == g:
        h = (b - r) / (mx - mn) + 2
    else:
        h = (r - g) / (mx - mn) + 4
    h *= 60
    for name, lo, hi in (("красный", 0, 15), ("оранжевый", 15, 40), ("жёлтый", 40, 70), ("зелёный", 70, 160),
                         ("голубой", 160, 200), ("синий", 200, 260), ("фиолетовый", 260, 290), ("розовый", 290, 345), ("красный", 345, 361)):
        if lo <= h < hi:
            return name
    return "?"


def features(d, xh, summary):
    t = d.get("tables") or {}
    mouse, vid, adv = t.get("Mouse") or {}, t.get("Video Settings") or {}, t.get("Advanced Video") or {}
    cv = d.get("convars") or {}
    cmds = {}
    for c in (xh or {}).get("commands", []):
        p = c.split(None, 1)
        if len(p) == 2:
            cmds[p[0]] = p[1]
    f = {
        "dpi": num(mouse.get("DPI") or summary.get("dpi")),
        "sens": num(mouse.get("Mouse Sensitivity") or summary.get("sens")),
        "edpi": summary.get("edpi"),
        "res": vid.get("Resolution") or summary.get("res"),
        "ar": vid.get("Aspect Ratio"),
        "sc": vid.get("Scaling mode"),
        "dm": vid.get("Display Mode"),
        "br": vid.get("Brightness"),
        "fov": num(cv.get("viewmodel_fov")),
        "ox": num(cv.get("viewmodel_offset_x")),
        "oy": num(cv.get("viewmodel_offset_y")),
        "oz": num(cv.get("viewmodel_offset_z")),
        "ps": num(cv.get("viewmodel_presetpos")),
        "xs": num(cmds.get("cl_crosshairstyle")),
        "xl": num(cmds.get("cl_crosshair_length")),
        "xt": num(cmds.get("cl_crosshair_thickness")),
        "xg": num(cmds.get("cl_crosshair_gap")),
        "xc": color_name(cmds.get("cl_crosshaircolor_r"), cmds.get("cl_crosshaircolor_g"), cmds.get("cl_crosshaircolor_b")) if cmds else None,
        "xd": num(cmds.get("cl_crosshairdot")),
        "xo": num(cmds.get("cl_crosshair_drawoutline")),
        "msaa": adv.get("Multisampling Anti-Aliasing Mode"),
        "shq": adv.get("Global Shadow Quality"),
        "tex": adv.get("Model / Texture Detail"),
        "flt": adv.get("Texture Filtering Mode"),
        "shd": adv.get("Shader Detail"),
        "prt": adv.get("Particle Detail"),
        "dsh": adv.get("Dynamic Shadows"),
        "ao": adv.get("Ambient Occlusion"),
        "hdr": adv.get("High Dynamic Range"),
        "fsr": adv.get("FidelityFX Super Resolution"),
        "bpc": adv.get("Boost Player Contrast"),
        "vs": adv.get("V-Sync"),
        "rfx": adv.get("NVIDIA Reflex Low Latency"),
        "fps": num(cv.get("fps_max")),
        "lo": d.get("launch_options") or None,
        "poll": mouse.get("Polling rate"),
    }
    return {k: v for k, v in f.items() if v not in (None, "")}


# ------------------------------------------------------------ git (для разовой истории)

class Git:
    def __init__(self, repo):
        self.repo = str(repo)
        self.p = subprocess.Popen(["git", "-C", self.repo, "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)

    def read(self, ref):
        self.p.stdin.write((ref + "\n").encode())
        self.p.stdin.flush()
        hdr = self.p.stdout.readline().decode().split()
        if not hdr or hdr[-1] == "missing":
            return None
        data = self.p.stdout.read(int(hdr[2]))
        self.p.stdout.read(1)
        return data.decode("utf-8")

    def run(self, *a):
        return subprocess.check_output(["git", "-C", self.repo, *a], text=True)

    def close(self):
        self.p.stdin.close()
        self.p.wait()


def backfill(src):
    """События изменений из истории обновлений данных в git источника."""
    g = Git(src)
    lines = g.run("log", "--reverse", "--format=%H %cs", "--", "data/players", "data/index.json").split("\n")
    commits = [l.split() for l in lines if l.strip()]
    profiles, events, prev = {}, [], None
    for sha, day in commits:
        idx = json.loads(g.read(f"{sha}:data/index.json"))["players"]
        slugs = [p["slug"] for p in idx]
        if prev is None:
            changed = set(slugs)
        else:
            names = g.run("diff", "--name-only", prev, sha, "--", "data/players").split()
            changed = {Path(n).stem for n in names}
            changed |= set(slugs) - set(profiles)
        for s in slugs:
            if s not in changed:
                continue
            raw = g.read(f"{sha}:data/players/{s}.json")
            if raw is None:
                continue
            new = flat(json.loads(raw))
            if prev is not None:
                if s not in profiles:
                    events.append({"d": day, "s": s, "n": 1})
                else:
                    ch = diff(profiles[s], new)
                    if ch:
                        events.append({"d": day, "s": s, "k": ch})
            profiles[s] = new
        for s in list(profiles):
            if s not in slugs:
                del profiles[s]
        prev = sha
    g.close()
    return events, len(commits)


# ------------------------------------------------------------ основная сборка

def build(src, do_backfill):
    src = Path(src)
    idx_doc = jload(src / "data/index.json")
    xh_all = (jload(src / "data/crosshair.json") or {}).get("players", {})
    players = idx_doc["players"]
    src_date = ((idx_doc.get("meta") or {}).get("generated") or "")[:10] or str(date.today())

    profiles, feats = {}, {}
    for p in players:
        s = p["slug"]
        d = jload(src / f"data/players/{s}.json")
        if not d:
            continue
        profiles[s] = flat(d)
        feats[s] = features(d, xh_all.get(s), p)

    old_meta = jload(HERE / "meta.json", {}) or {}
    events = list(old_meta.get("changes", []))
    if do_backfill:
        events, n = backfill(src)
        print(f"история: {n} коммитов данных -> {len(events)} событий")
    else:
        state = jload(HERE / "state.json")
        if state:
            for s, new in profiles.items():
                if s not in state:
                    events.append({"d": src_date, "s": s, "n": 1})
                else:
                    ch = diff(state[s], new)
                    if ch:
                        events.append({"d": src_date, "s": s, "k": ch})
        else:
            print("state.json нет — запустите с --backfill или это первый запуск (изменения не считаются)")

    # срок хранения
    if events:
        newest = max(e["d"] for e in events)
        cutoff = str(date.fromisoformat(newest) - timedelta(days=KEEP_DAYS))
        events = [e for e in events if e["d"] >= cutoff]
    events.sort(key=lambda e: (e["d"], e["s"]), reverse=True)
    events = events[:KEEP_EVENTS]

    # команды
    tj = jload(HERE / "teams.json") or {"teams": []}
    by_norm = {}
    for p in players:
        by_norm.setdefault(norm(p["nick"]), []).append(p["slug"])
    teams, missing = [], 0
    for t in tj["teams"]:
        slugs, miss = [], []
        for nick in t["players"]:
            c = by_norm.get(norm(nick), [])
            if not c:
                miss.append(nick)
                missing += 1
                continue
            slugs.append(next((x for x in c if norm(x) == norm(nick)), c[0]))
        teams.append({"r": t["rank"], "n": t["name"], "p": slugs, "m": miss})

    meta = {
        "v": 1,
        "source_generated": src_date,
        "teams": {"asOf": tj.get("asOf"), "source": tj.get("source"), "url": tj.get("sourceUrl"), "list": teams},
        "f": feats,
        "changes": events,
    }
    (HERE / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (HERE / "state.json").write_text(json.dumps(profiles, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    inteam = sum(len(t["p"]) for t in teams)
    print(f"готово: игроков {len(feats)}, команд {len(teams)} (игроков в командах {inteam}, не найдено в базе {missing}), событий {len(events)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    build(sys.argv[1], "--backfill" in sys.argv)
