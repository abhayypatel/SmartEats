db = db.getSiblingDB("smarteats");

db.createCollection("users");
db.createCollection("fooditems");
db.createCollection("meals");

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { sparse: true });
db.fooditems.createIndex({ name: "text", brand: "text" });
db.fooditems.createIndex({ category: 1 });
db.fooditems.createIndex({ barcode: 1 }, { sparse: true });
db.meals.createIndex({ user: 1, date: -1 });

print("✅ SmartEats database initialized successfully!");
