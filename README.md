Absolutely 👍 — here’s your `README.md` **perfectly formatted for GitHub**, with consistent spacing, markdown syntax, and emoji headers preserved for a clean, professional look 👇

---

# 🚀 ASAP Apps

This repo contains two independent Expo apps — **Customer App** and **Rider App** — located in the same folder but running separately.

---

## 📂 Structure

```
ASAP_APPS/
├── customer_app/     # Customer-facing app
├── rider_app/        # Rider-facing app
├── start-apps.bat    # Windows startup script
├── start-apps.sh     # Mac/Linux startup script
└── README.md
```

Each app has its own **node_modules**, **package.json**, and **Expo config**.

---

## ⚙️ Setup

Install dependencies for both apps:

```bash
cd customer_app && npm install
cd ../rider_app && npm install
```

---

## ▶️ Run Apps

### 🪟 Windows

```bash
start-apps.bat
```

### 🖥️ Mac / Linux

```bash
./start-apps.sh
```

Both scripts will:

- Ask if you want to clear Expo’s cache.
- Launch **Customer App** and **Rider App** in separate terminals.

---

## 🌐 Default URLs

| App      | Port | URL                                                    |
| -------- | ---- | ------------------------------------------------------ |
| Customer | 8081 | [http://localhost:8081](http://localhost:8081)         |
| Rider    | 8082 | [http://localhost:8082](http://localhost:8082)         |
| Website  | 8082 | [http://localhost:3000](https://asap-apps.vercel.app/) |

Scan the QR code in **Expo Go** to open on a device.

---

## 🧠 Notes

- Each app runs independently (**not a monorepo**).
- Keep configs and `.env` files separate.
- Built with **React Native + Expo**.

adb pair 172.24.162.241:[PORT_ON_SCREEN]
adb connect 172.24.162.241:[NEW_PORT]
adb logcat \*:S ReactNative:V ReactNativeJS:V
adb logcat | FINDSTR "com.yourname.riderapp"
adb shell pidof com.yourname.riderapp
adb logcat --pid=1234
adb shell ps | FINDSTR "rider"
