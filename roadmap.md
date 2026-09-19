# Roadmap

- [x] 删除 `src/data/greensprout.ts` 第 641 行孤立的 Markdown 围栏符号 ```
- [x] 运行 `bunx tsgo --noEmit` 并检查开发服务器编译状态 → 已汇报，等待用户决定
- [ ] （待用户决定）`src/services/activity-mapper.ts` 第 1 行有同类 ```ts 围栏符号，阻塞编译
- [ ] （待用户决定）`src/services/user.ts`（80 个）、`activities.ts`（3 个）、`gs-store.tsx`（2 个）类型错误——代码引用了当前后端类型定义中不存在的表/字段
- [ ] 环境变量 / 后端归属问题（xdpzwuequqewdlbmfvqo vs yggrprjioyigtmlqkthx）— 用户要求下一步单独处理
