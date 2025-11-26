# Google Sheets Setup Guide for PPF Cafe

## 📋 Menu Sheet Columns

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| id | Text/Number | Unique item ID | 1, 2, 3... |
| category | Text | Item category | Burgers, Fries, Drinks |
| name | Text | Item name | Classic Burger |
| type | Text | Item type (veg/egg/drinks) | veg |
| dinePrice | Number | Dine-in price | 150 |
| deliveryPrice | Number | Delivery price | 180 |
| availability | Boolean | Is item available? | true/false |
| deliverable | Boolean | Can be delivered? | true/false |
| image | Text | Image URL/path | /burger.jpg |
| description | Text | Item description | Delicious veg burger |

**Example Data:**
```
1 | Burgers | Classic Burger | veg | 150 | 180 | true | true | /burger.jpg | Delicious veg burger
2 | Fries | Regular Fries | veg | 80 | 100 | true | true | /fries.jpg | Crispy golden fries
3 | Drinks | Coke | drinks | 40 | 50 | true | false | /coke.jpg | Chilled Coca-Cola
4 | Burgers | Egg Burger | egg | 120 | 150 | true | true | /burger.jpg | Tasty egg burger
```

**Item Types:**
- `veg`: Vegetarian items
- `egg`: Items containing egg
- `drinks`: Beverages

## 🚀 Google Apps Script Setup

1. Open your Google Sheet
2. Go to **Extensions** → **Apps Script**
3. Copy the code from `SCRIPT.md`
4. Update `SHEET_ID` with your sheet ID
5. Deploy as Web App
6. Copy the URL to `.env` file as `VITE_SHEET_API_URL`
