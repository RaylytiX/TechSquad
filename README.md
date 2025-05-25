# 📌 **Описание проекта**  

**Raylytix** — это универсальное решение для поиска аномалий на рентгенограммах сварных швов.  
Предложенное решение представляет собой полноценный сервис, который позволяет не только обрабатывать фото-материалы рентгенограмм, но и обладает:
- удобным интерфейсом  
- высокой скоростью работы  
- возможностью сохранять историю запросов  
 
Это даёт возможность вернуться к уже проведённой аналитике в любой момент.

# 🚀 Локальный запуск проекта

## 🛠️ Запуск backend части проекта

📌 **Важно!** 
> 1. Перед запуском **всех сервисов** настройте зависимости(**`.env`**), примерный файл лежит в [`configs/`](https://github.com/Serfetto/techsquad/tree/main/backend/configs)
> 2. Перед запуском `modelService`, скачайте шрифт для генерации отчетов по [ссылке](https://drive.google.com/file/d/1xxvl2KyPHcil1-I7lEK1CkPAm5APblP-/view?usp=sharing) и поместите скачаный файл в директорию [`backend/`](https://github.com/Serfetto/techsquad/tree/main/backend)
> 3. Перед запуском `modelService`, скачайте модель по [ссылке](https://drive.google.com/file/d/11U-cLcmR2DF46vkRFJIyawPILVHBWRwD/view?usp=sharing) и поместите файл в директорию [`configs/`](https://github.com/Serfetto/techsquad/tree/main/backend/configs)

---

Откройте **три терминала** и выполните в каждом следующие шаги:

### 🔄 Шаги 1–3: подготовка окружения

В каждом терминале выполните команды:

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # или source .venv/bin/activate для Linux/macOS
```
### 📦 Шаг 4: установка зависимостей

В одном из терминалов установите зависимости:

```
pip install -r configs/requirements.txt
```

### 🚀 Шаг 5: запуск сервисов

Теперь в каждом терминале запустите один из сервисов:

- **Терминал 1:** 
```
python -m clientService.app
```
- **Терминал 2:** 
```
python -m authService.app
```
- **Терминал 3:**
```
python -m modelService.app
```
## 🛠️ Доступ к Swagger-документации
После запуска сервисов вы можете открыть документацию по каждому из них в браузере:

- 🔐 http://localhost:8001/docs — authService
- 👥 http://localhost:8002/docs — clientService
- 🤖 http://localhost:8003/docs — modelService

## 🌐 Запуск Frontend части проекта

### 📦 Подготовка окружения и запуск
В терминале выполните команды:

```bash
cd frontend
npm install
npm run dev
```
### 🛠️ Доступ к сайту
После запуска backend и frontend части вы можете открыть сайт:
- 🌐 http://localhost:5173

# 🚀 Запуск проекта через Docker

📌 **Важно!**  
> Перед созданием контейнеров необходимо:
>
> ✅ Настроить конфигурационные зависимости:
> - Скопируйте файл `.env-docker` из [`backend/configs/`](https://github.com/Serfetto/techsquad/tree/main/backend/configs) и переименуйте его в `.env`.
> - Скопируйте файл `vite.config-docker.js` из [`frontend/`](https://github.com/Serfetto/techsquad/tree/main/frontend/) и переименуйте его в `vite.config.js`.
>
> 🛠️ Скачать шрифт с кирилицей
> - Скачайте шрифт для генерации отчетов по [ссылке](https://drive.google.com/file/d/1xxvl2KyPHcil1-I7lEK1CkPAm5APblP-/view?usp=sharing)
> - Поместить скачаный файл в директорию [`backend/`](https://github.com/Serfetto/techsquad/tree/main/backend)
> 
> 🤖 Подготовить модель для `modelService`:
> - Скачайте предобученную модель по [ссылке](https://drive.google.com/file/d/11U-cLcmR2DF46vkRFJIyawPILVHBWRwD/view?usp=sharing)
> - Поместите файл модели в директорию [`configs/`](https://github.com/Serfetto/techsquad/tree/main/backend/configs)

---

## ▶️ Команда запуска

Откройте терминал в **корневой директории проекта** (там, где находится `docker-compose.yml`) и выполните команду:

```bash
docker compose --env-file ./backend/configs/.env up --build
```

## 🛠️ Доступ к Swagger-документации
После запуска сервисов вы можете открыть документацию по каждому из них в браузере:

- 🔐 http://localhost:8001/docs — authService
- 👥 http://localhost:8002/docs — clientService
- 🤖 http://localhost:8003/docs — modelService

## 🛠️ Доступ к сайту
После создания контейнеров backend и frontend части вы можете открыть сайт:
- 🌐 http://localhost:5173

---

> ℹ️ **Инфо:** Более подробно ознакомиться со структурой проекта вы можете, перейдя в соответствующие разделы `Backend` и `Frontend`.
