# 黎明杯初赛对阵表

- 初赛对阵表
- 全局积分榜 / 分赛区积分榜
- 管理页（编辑比分、下载新的 `matches.json`）

## 如何使用

1. 直接把这些文件推到 GitHub 仓库。
2. 在 GitHub Pages 里选择从 `main` 分支部署。
3. 打开 `admin.html`，录入比分。
4. 点击“保存并下载 JSON”，把新的 `matches.json` 提交回仓库。

## 本地预览

因为前端使用 `fetch()` 加载 JSON，所以不要直接双击打开文件。用任意本地静态服务器启动即可，例如：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。

## 重新生成对阵表

`data/matches.json` 是根据 `data/teams.json` 生成的。你可以修改队伍列表后，再运行 `scripts/generate-matches.js` 重新生成。
