# Публикация HW 60

## Отдельный репозиторий

В корень нового пустого репозитория загрузите содержимое `projects/hw-60`, включая скрытую `.github`. `package.json` должен лежать в корне, без дополнительной вложенной папки.

После `npm install` и локальных проверок выполните команды самостоятельно:

```bash
git init -b main
git add .
git commit -m "Initial project"
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

Для существующего репозитория не нужно заново выполнять `git init` и `git remote add`. Проверьте текущую ветку и состояние индекса перед своими Git-командами.

## GitHub Pages

В Settings → Pages → Build and deployment выберите Source → GitHub Actions. Затем Actions → Check and deploy to GitHub Pages → Run workflow → main. Последующие push в main запускают workflow автоматически. Pull request выполняет проверки без публикации.

Workflow устанавливает пакеты, запускает `npm run check`, Chromium-сценарии и отчёт Vitest. Только после успешных проверок `dist` публикуется через Pages. Используется Node.js 24. При наличии `package-lock.json` выполняется `npm ci`, иначе — `npm install`.

Все пути к статическим ресурсам относительные. Имя репозитория не нужно вписывать в исходники; корень пользовательского сайта и вложенный project-site поддерживаются одной сборкой. `.nojekyll` добавляется при сборке. После успешного деплоя замените шаблон в README настоящим URL.

GitHub Pages не запускает Express, `fs` или `zlib` на сервере. Публикуется явно обозначенное браузерное демо. Настоящий API запускается отдельно через `npm start`; данные Map не переживают перезапуск процесса.

## Типичные проблемы

404 на сайте: проверьте успешность Actions, источник GitHub Actions в Pages и наличие `.github/workflows/pages.yml` в корне репозитория. Для первого деплоя включите Pages и вручную повторите workflow.

Ошибка установки: проверьте доступ к npm registry и версию Node.js. Не запускайте `npm ci` без lockfile.

Ошибка запуска Chromium: выполните `npx playwright install chromium`; на Linux при необходимости `npx playwright install --with-deps chromium`.

EADDRINUSE: остановите старый процесс через Ctrl+C или выберите свободный порт. Для preview — `npm run preview -- --port 4174`; для Express — PORT в .env.

Нельзя утверждать, что сайт опубликован, пока Actions не завершился успешно и фактический адрес не открыт в браузере.
