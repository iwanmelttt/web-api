// models/Trip.js
// Since we are using SQLite, we don't use Mongoose schemas.
// Instead, we export clean SQL database helper functions!

module.exports = {
    // 1. READ: Fetch all trips and format them for app.js
    async findAll(db) {
        const rows = await db.all('SELECT * FROM trips');
        return rows.map(row => ({
            _id: row.id, 
            destination: row.destination,
            startDate: row.start_date,
            notes: row.notes,
            weatherData: { temperature: row.temperature, condition: row.condition },
            locationData: { latitude: row.latitude, longitude: row.longitude },
            attractions: JSON.parse(row.attractions || "[]") // Turn string back to an array
        }));
    },

    // 2. CREATE: Insert a new trip row into the database
    async create(db, { destination, startDate, notes, temperature, condition, latitude, longitude, attractions }) {
        const stringifiedAttractions = JSON.stringify(attractions || []);
        const query = `INSERT INTO trips (destination, start_date, notes, temperature, condition, latitude, longitude, attractions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const result = await db.run(query, [destination, startDate, notes, temperature, condition, latitude, longitude, stringifiedAttractions]);
        return result.lastID; // Returns the newly created row ID
    },

    // 3. DELETE: Remove a trip row using its ID
    async delete(db, id) {
        await db.run('DELETE FROM trips WHERE id = ?', [id]);
    }
};