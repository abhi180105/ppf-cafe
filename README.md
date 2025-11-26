# PPF Cafe - Google Sheets Managed Website

A modern cafe website fully managed through Google Sheets. Update menu, combos, promos, and cafe status without touching code!

## 🎯 Features

- **Menu Management**: Add, edit, remove menu items from Google Sheets
- **Combo Deals**: Create special combo offers with automatic pricing
- **Promotions**: Time-based, code-based, and value-based discounts
- **Status Control**: Manage cafe open/close status and timings
- **Reviews System**: Customer reviews automatically saved to sheets
- **Real-time Updates**: Changes reflect immediately on the website

## 📚 Documentation

- **[SHEETS_SETUP_GUIDE.md](./SHEETS_SETUP_GUIDE.md)** - Complete guide to set up and manage Google Sheets
- **[SCRIPT.md](./SCRIPT.md)** - Google Apps Script code for the backend API

## 🚀 Quick Start

1. Set up Google Sheets with 5 required sheets (see SHEETS_SETUP_GUIDE.md)
2. Deploy the Google Apps Script (see SCRIPT.md)
3. Update `.env` file with your API URL
4. Run `npm install` and `npm run dev`

## 📋 Required Google Sheets

1. **Menu** - Menu items with pricing
2. **Reviews** - Customer reviews
3. **Status** - Cafe open/close status
4. **Combos** - Combo deals
5. **Promos** - Promotional offers

## 🛠️ Tech Stack

- React + Vite
- Google Sheets API (via Apps Script)
- CSS Modules
- Context API for state management

## 📞 Managing Your Cafe

All cafe management is done through Google Sheets:
- Update menu items and prices
- Create seasonal combos
- Launch promotional campaigns
- Control cafe operating hours
- View customer reviews

No code changes required! See SHEETS_SETUP_GUIDE.md for detailed instructions.