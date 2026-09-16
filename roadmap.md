# 任务清单

- [x] 删除 activities.ts 误入的 Markdown 围栏符号（修复解析错误）
- [x] 创建数据库表：activity_categories / activities / activity_members + 分类数据 + 自动报名触发器
- [x] 修复 gs-store.tsx 报名/取消时空值类型错误
- [ ] 等待用户同意后：修复剩余 5 处类型不匹配（mapper 部分字段类型、eligibility 的 Json 转换、活动与发起人资料的关联查询）
- [ ] 修复后运行类型检查，确认构建通过、可发布

## 规则
- 任何计划/改动都先告知用户，用户同意后才执行。
