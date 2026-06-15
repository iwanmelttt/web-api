// =========================================================
// 1. SECURITY ACCESS GATE GUARD & SESSION MANAGEMENT
// =========================================================
const sessionToken = localStorage.getItem('wanderlust_jwt_token');
if (!sessionToken) {
    // If no token exists, immediately redirect to login page
    window.location.href = '/login.html';
}

// Global log out utility function
window.logoutUserSession = function() {
    localStorage.removeItem('wanderlust_jwt_token');
    window.location.href = '/login.html';
};


// =========================================================
// 2. DOM ELEMENTS & EVENT LISTENERS
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    // Fetch and display all saved itineraries when dashboard loads
    fetchTripsFromDatabase();

    // Attach submit handler to the trip entry form
    const tripForm = document.getElementById('tripForm');
    if (tripForm) {
        tripForm.addEventListener('submit', handleTripSubmission);
    }
});


// =========================================================
// 3. READ: FETCH TRIPS FROM SQLITE DATABASE
// =========================================================
async function fetchTripsFromDatabase() {
    try {
        const response = await fetch('/api/trips', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${sessionToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // If token expired or is invalid, kick to login
                window.logoutUserSession();
                return;
            }
            throw new Error('Failed to fetch trip list.');
        }

        const trips = await response.json();
        renderTripDashboardCards(trips);
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Could not synchronize dashboard data with SQLite.');
    }
}


// =========================================================
// 4. CREATE: EXTRACT FROM FORM & LOAD INTO BACKEND ETL
// =========================================================
async function handleTripSubmission(event) {
    event.preventDefault();

    const destinationInput = document.getElementById('destination');
    const startDateInput = document.getElementById('startDate');
    const notesInput = document.getElementById('notes');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    // Simple visual loading state change
    if (submitBtn) {
        submitBtn.textContent = 'Downloading API Data...';
        submitBtn.disabled = true;
    }

    const newTripPayload = {
        destination: destinationInput.value,
        startDate: startDateInput.value,
        notes: notesInput.value
    };

    try {
        const response = await fetch('/api/trips', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify(newTripPayload)
        });

        if (!response.ok) throw new Error('Could not compile API data.');

        // Reset input fields upon success
        destinationInput.value = '';
        startDateInput.value = '';
        notesInput.value = '';

        // Refresh dashboard displaying the updated API structures inside SQLite
        await fetchTripsFromDatabase();

    } catch (error) {
        console.error('Submission Error:', error);
        alert('Failed to drop and download API data to database.');
    } finally {
        if (submitBtn) {
            submitBtn.textContent = 'Add Trip Log';
            submitBtn.disabled = false;
        }
    }
}


// =========================================================
// 5. DELETE: SCRUB RECORDS FROM HISTORY
// =========================================================
async function deleteTripRecord(tripId) {
    if (!confirm('Are you sure you want to permanently erase this itinerary entry?')) return;

    try {
        const response = await fetch(`/api/trips/${tripId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });

        if (!response.ok) throw new Error('Delete operation failed.');
        
        // Refresh UI
        await fetchTripsFromDatabase();
    } catch (error) {
        console.error('Delete Error:', error);
        alert('Could not scrub item from SQLite database.');
    }
}


// =========================================================
// 6. DYNAMIC UI RENDERING (API-DATA DATA INTERFACING)
// =========================================================
function renderTripDashboardCards(trips) {
    const container = document.getElementById('tripsContainer');
    if (!container) return;

    container.innerHTML = ''; // Clear container

    if (trips.length === 0) {
        container.innerHTML = `<p class="no-trips-msg">No adventures logged yet. Type a destination above to see the database API pipeline in action!</p>`;
        return;
    }

    // Build unique UI cards for every trip entry inside SQLite
    trips.forEach(trip => {
        const card = document.createElement('div');
        card.className = 'trip-card';

        // 1. Process downloaded Weather Data
        const temp = trip.weatherData && trip.weatherData.temperature !== null ? `${trip.weatherData.temperature}°C` : 'N/A';
        const condition = trip.weatherData && trip.weatherData.condition ? trip.weatherData.condition : 'No Forecast Found';

        // 2. Process downloaded Geoapify Attractions list
        let attractionsHTML = '<p><em>No nearby attraction points found.</em></p>';
        if (trip.attractions && trip.attractions.length > 0) {
            attractionsHTML = `<ul>${trip.attractions.map(place => `<li>📍 ${place}</li>`).join('')}</ul>`;
        }

        // Build HTML template inserting values seamlessly
        card.innerHTML = `
            <div class="trip-card-header">
                <h3>✈️ ${escapeHTML(trip.destination)}</h3>
                <span class="trip-date">📅 ${escapeHTML(trip.startDate)}</span>
            </div>
            
            <div class="trip-card-body">
                <div class="weather-badge">
                    <strong>Live Weather Downloaded:</strong> 
                    <span>${temp}, ${condition}</span>
                </div>
                
                <p class="trip-notes"><strong>Personal Notes:</strong> ${escapeHTML(trip.notes || 'No added details.')}</p>
                
                <div class="attractions-box">
                    <strong>Top Regional Attractions (Geoapify API):</strong>
                    ${attractionsHTML}
                </div>
            </div>
            
            <div class="trip-card-footer">
                <button class="delete-btn" onclick="deleteTripRecord('${trip._id}')">Remove Record</button>
            </div>
        `;

        container.appendChild(card);
    });
}


// =========================================================
// 7. UTILITY SANITIZATION SECURITY HELPER (XSS Protection)
// =========================================================
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}