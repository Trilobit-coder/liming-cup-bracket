import json
from datetime import datetime, timedelta


def generate_optimized_matches():
    # 1. 赛区配置：起始时间与队伍列表
    # A/B/C 11支队, D 10支队
    region_configs = {
        "A": {
            "start": datetime(2026, 4, 19, 9, 0),
            "teams": [f"A{i:02d}" for i in range(1, 12)],
        },
        "B": {
            "start": datetime(2026, 4, 19, 14, 0),
            "teams": [f"B{i:02d}" for i in range(1, 12)],
        },
        "C": {
            "start": datetime(2026, 4, 20, 9, 0),
            "teams": [f"C{i:02d}" for i in range(1, 12)],
        },
        "D": {
            "start": datetime(2026, 4, 20, 14, 0),
            "teams": [f"D{i:02d}" for i in range(1, 11)],
        },
    }

    all_matches = []
    global_id = 1

    for r_name, config in region_configs.items():
        teams = config["teams"]
        n = len(teams)
        start_time = config["start"]

        # 使用“跳步法”重新编排比赛顺序，以实现全员间隔均匀
        # 原理：第 i 场比赛由 Team[i] 对阵 Team[(i + step) % n]
        # 对于11人，步长取5；对于10人，步长取5
        step = 5
        local_matches = []
        for i in range(n):
            home = teams[i]
            away = teams[(i + step) % n]
            local_matches.append((home, away))

        # 写入 JSON 格式
        for i, (home, away) in enumerate(local_matches):
            # 每场间隔 20 分钟
            match_time = start_time + timedelta(minutes=i * 20)

            match_obj = {
                "id": f"M{global_id:03d}",
                "region": r_name,
                "round": 1 if i < n // 2 else 2,  # 逻辑轮次标识
                "matchNo": i + 1,
                "date": match_time.strftime("%Y-%m-%d"),
                "time": match_time.strftime("%H:%M"),
                "venue": f"{r_name}区场馆",
                "homeTeamId": home,
                "awayTeamId": away,
                "homeScore": None,
                "awayScore": None,
                "status": "pending",
                "notes": f"{r_name}赛区初赛",
            }
            all_matches.append(match_obj)
            global_id += 1

    return all_matches


# 执行生成
matches_data = generate_optimized_matches()

# 验证均匀性（以A区为例）
print("--- 赛程间隔校验 (A区) ---")
a_team_times = {}
for m in [m for m in matches_data if m["region"] == "A"]:
    for tid in [m["homeTeamId"], m["awayTeamId"]]:
        if tid not in a_team_times:
            a_team_times[tid] = []
        a_team_times[tid].append(m["matchNo"])

for tid, matches in a_team_times.items():
    interval = matches[1] - matches[0]
    print(
        f"队伍 {tid}: 参加第 {matches[0]} 场和第 {matches[1]} 场, 间隔: {interval-1} 场"
    )

# 保存
with open("data/matches.json", "w", encoding="utf-8") as f:
    json.dump(matches_data, f, ensure_ascii=False, indent=2)

print(f"\n成功生成 {len(matches_data)} 场比赛数据至 data/matches.json")
