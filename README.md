# GreenSprout First Bloom

Create the first lightweight prototype for '绿芽局 GreenSprout' (同城即时活动社交应用).

Design aesthetic:
- Minimalist, high-end MUJI style (clean typography, neutral warm tones, breathable layout) with Ghibli-inspired warm illustration accents and soft natural colors.
- Component-driven architecture where tags, activity types, user fields, and filters are driven by configurable data structures rather than hardcoded layouts. No paid third-party APIs or external dependencies.

Core MVP Pages to build:
1. Activity Discovery (首页/活动大厅):
   - Time filters: 本周 (This Week), 一周后 (In 1 Week), 两周后 (In 2 Weeks), 一个月后 (In 1 Month).
   - Category filter chips: 跑圈, 羽毛球, 咖啡, 晚餐, 音乐会, 女性专属, etc.
   - Event cards showing cover image, title, start/end time, location, participant slots (e.g. 3/6已报), tags, deposit/fee status, and host info.
   - Interactive preview of event status (open vs ended / 12h countdown).

2. Event Detail & Join Modal (活动详情与报名):
   - Rich event schedule, host profile snippet, attendee requirements/filters (age, gender, education, income, etc.).
   - Join button and Cancel button with the explicit rule: "活动开始前2小时内不可取消".
   - Temporary Chat Room preview (unlocks when 1+ attendee joins, displays notice that it dissolves 12h after event ends).

3. Create Event Wizard (发起活动):
   - Fast track using quick templates (跑圈, 羽毛球, 咖啡, 晚餐, 音乐会, 女性专属).
   - Custom event builder: title, cover image, location, start and end datetime pickers, participant limit, schedule/agenda, fee & non-refundable deposit toggle, and attendee eligibility filters.

4. User Profile & Registration Mock (个人资料与偏好设置):
   - Profile fields: nickname, email (with mock verification), gender, age, avatar, city/location, education, university, career, income tiers (0-10万, 10-20万, 30-50万, 50-100万, 100万+).
   - Hobby selector with 50 preset interest tags + custom tag adder.
   - Boundary/pet peeves (雷区) custom input.
   - Privacy toggles for liked activities and hosted activities.

Provide realistic Chinese mock data for all views so the user can interactively test the complete user journey immediately.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://greensprout-connect.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c5c38392-630f-4a96-b7f2-ff9df6502f53).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
