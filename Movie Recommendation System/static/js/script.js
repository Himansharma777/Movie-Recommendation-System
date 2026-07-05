document.addEventListener("DOMContentLoaded", () => {
    // --- State Variables ---
    let allMovies = [];
    let allGenres = [];
    let searchHistory = JSON.parse(localStorage.getItem("cineMatch_history")) || [];
    let favoriteMovies = JSON.parse(localStorage.getItem("cineMatch_favorites")) || [];
    let selectedSuggestionIndex = -1;
    let currentTheme = localStorage.getItem("cineMatch_theme") || "dark";
    
    // Cache for matching full movie objects from allMovies
    let movieDatabaseMap = {};

    // --- DOM Elements ---
    const body = document.body;
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    const searchInput = document.getElementById("movie-search-input");
    const clearSearchBtn = document.getElementById("clear-search-btn");
    const recommendBtn = document.getElementById("recommend-btn");
    const autocompleteDropdown = document.getElementById("autocomplete-suggestions");
    const randomMovieBtn = document.getElementById("random-movie-btn");
    const genresContainer = document.getElementById("genres-container");
    
    const errorPanel = document.getElementById("error-message-panel");
    const errorMessageText = document.getElementById("error-message-text");
    const closeErrorBtn = document.getElementById("close-error-btn");
    
    const recommendationsSection = document.getElementById("recommendations-section");
    const likedMovieTitle = document.getElementById("liked-movie-title");
    const loadingSkeleton = document.getElementById("recommendations-loading");
    const recommendationsGrid = document.getElementById("recommendations-grid");
    
    const recentSearchesList = document.getElementById("recent-searches-list");
    const clearHistoryBtn = document.getElementById("clear-history-btn");
    const favoritesGrid = document.getElementById("favorites-grid");
    
    const statMoviesCount = document.getElementById("stat-movies-count");
    const statGenresCount = document.getElementById("stat-genres-count");
    const statServedCount = document.getElementById("stat-served-count");
    
    // Modal Elements
    const detailsModal = document.getElementById("movie-details-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const modalMoviePoster = document.getElementById("modal-movie-poster");
    const modalSimilarityBadge = document.getElementById("modal-similarity-badge");
    const modalSimilarityPercentage = document.getElementById("modal-similarity-percentage");
    const modalMovieYear = document.getElementById("modal-movie-year");
    const modalMovieGenre = document.getElementById("modal-movie-genre");
    const modalMovieRating = document.getElementById("modal-movie-rating");
    const modalMovieTitle = document.getElementById("modal-movie-title");
    const modalMovieDescription = document.getElementById("modal-movie-description");
    const modalFavoriteBtn = document.getElementById("modal-favorite-btn");
    const modalRecommendDirectBtn = document.getElementById("modal-recommend-direct-btn");
    const modalRelatedGrid = document.getElementById("modal-related-grid");

    // --- Init App ---
    initTheme();
    fetchMoviesAndStats();
    renderFavorites();
    renderSearchHistory();

    // --- Theme Configuration ---
    function initTheme() {
        if (currentTheme === "light") {
            body.classList.remove("dark-theme");
            body.classList.add("light-theme");
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            body.classList.remove("light-theme");
            body.classList.add("dark-theme");
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }

    themeToggleBtn.addEventListener("click", () => {
        if (body.classList.contains("dark-theme")) {
            body.classList.remove("dark-theme");
            body.classList.add("light-theme");
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            currentTheme = "light";
        } else {
            body.classList.remove("light-theme");
            body.classList.add("dark-theme");
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            currentTheme = "dark";
        }
        localStorage.setItem("cineMatch_theme", currentTheme);
    });

    // --- Fetch initial dataset info ---
    async function fetchMoviesAndStats() {
        try {
            const response = await fetch("/movies");
            if (!response.ok) throw new Error("Failed to load catalog data.");
            
            const data = await response.json();
            allMovies = data.movies;
            allGenres = data.genres;
            
            // Build temporary detail mappings to quickly construct cards on autocomplete clicks
            // We can fetch details via a simulation later
            buildMovieMap();
            
            // Render genre badges
            renderGenreBadges();
            
            // Animate Stats Dashboard
            animateStatCounter(statMoviesCount, data.stats.total_movies);
            animateStatCounter(statGenresCount, data.stats.total_genres);
            animateStatCounter(statServedCount, data.stats.recommendations_served);
        } catch (error) {
            console.error("Initialization Error:", error);
            showError("Could not connect to Flask backend. Please make sure the server is running.");
        }
    }

    // Since /movies returns titles, we can query details recursively when needed, or simulate details.
    // Let's create an internal database map by loading detailed properties inside script memory or 
    // retrieving it when we generate recommendations.
    // In our system, all recommendations will return full objects including genre, rating, overview etc.
    // We will save these objects into our client-side database mapping map, so we can render details instantly
    // for recent searches or favorites!
    function buildMovieMap() {
        // Hydrate details as they become available from recommendations
        const savedFavorites = JSON.parse(localStorage.getItem("cineMatch_favorites_detailed")) || {};
        movieDatabaseMap = { ...savedFavorites };
    }

    function saveMovieToDatabaseMap(movie) {
        if (!movie || !movie.title) return;
        movieDatabaseMap[movie.title.toLowerCase()] = movie;
        
        // Save favorites details separately to preserve across sessions
        const detailedFavorites = {};
        favoriteMovies.forEach(title => {
            const lowerTitle = title.toLowerCase();
            if (movieDatabaseMap[lowerTitle]) {
                detailedFavorites[lowerTitle] = movieDatabaseMap[lowerTitle];
            }
        });
        localStorage.setItem("cineMatch_favorites_detailed", JSON.stringify(detailedFavorites));
    }

    // --- Counter Animation ---
    function animateStatCounter(element, target) {
        let count = 0;
        const duration = 1200; // milliseconds
        const increment = target / (duration / 16); // 60 FPS
        
        if (target === 0) {
            element.textContent = "0";
            return;
        }

        const timer = setInterval(() => {
            count += increment;
            if (count >= target) {
                clearInterval(timer);
                element.textContent = Math.round(target).toLocaleString();
            } else {
                element.textContent = Math.round(count).toLocaleString();
            }
        }, 16);
    }

    // --- Render Genre Badges ---
    function renderGenreBadges() {
        // Clear all except default "All Genres"
        genresContainer.innerHTML = '<div class="genre-badge active" data-genre="All">All Genres</div>';
        
        allGenres.forEach(genre => {
            const badge = document.createElement("div");
            badge.className = "genre-badge";
            badge.dataset.genre = genre;
            badge.textContent = genre;
            genresContainer.appendChild(badge);
        });

        // Add event listeners to badges
        genresContainer.addEventListener("click", (e) => {
            if (e.target.classList.contains("genre-badge")) {
                document.querySelectorAll(".genre-badge").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                
                const selectedGenre = e.target.dataset.genre;
                if (selectedGenre !== "All") {
                    // Pick a random movie from that genre and recommend it
                    triggerRandomMovieFromGenre(selectedGenre);
                }
            }
        });
    }

    async function triggerRandomMovieFromGenre(genre) {
        showLoadingState();
        try {
            // Find movies in this genre by querying recommendations or simulating client-side filter
            // To do this simply, we call our recommendation with a special helper or get a random movie.
            // Let's filter our local titles by asking the backend, or since our random movie button picks a movie,
            // we can fetch movie list. But since local memory only has titles, let's select a movie that matches genre.
            // Wait, we don't have movie-genres loaded locally unless we loaded them.
            // Let's fetch recommendations for a random movie from the database.
            // We can ask backend or pick one. Let's make an API call or pick from titles.
            // We will fetch recommendations for a random movie.
            pickRandomAndRecommend(genre);
        } catch (error) {
            hideLoadingState();
        }
    }

    // --- Autocomplete Search ---
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        selectedSuggestionIndex = -1;
        
        if (!query) {
            clearSearchBtn.style.display = "none";
            hideSuggestions();
            return;
        }

        clearSearchBtn.style.display = "block";
        
        // Filter movies locally (starts with or contains)
        const filtered = allMovies.filter(title => 
            title.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8); // top 8 suggestions

        if (filtered.length > 0) {
            renderSuggestions(filtered, query);
        } else {
            hideSuggestions();
        }
    });

    function renderSuggestions(suggestions, query) {
        autocompleteDropdown.innerHTML = "";
        
        suggestions.forEach((title, idx) => {
            const div = document.createElement("div");
            div.className = "suggestion-item";
            div.dataset.index = idx;
            div.dataset.title = title;
            
            // Highlight matching letters
            const regex = new RegExp(`(${query})`, "gi");
            const highlightedTitle = title.replace(regex, "<strong>$1</strong>");
            
            // Try to find cached genre
            const cachedMovie = movieDatabaseMap[title.toLowerCase()];
            const genreBadge = cachedMovie ? `<span class="suggestion-genre">${cachedMovie.genre}</span>` : "";

            div.innerHTML = `
                <span>${highlightedTitle}</span>
                ${genreBadge}
            `;
            
            div.addEventListener("click", () => {
                searchInput.value = title;
                hideSuggestions();
                getMovieRecommendations(title);
            });
            
            autocompleteDropdown.appendChild(div);
        });
        
        autocompleteDropdown.style.display = "block";
    }

    function hideSuggestions() {
        autocompleteDropdown.style.display = "none";
        autocompleteDropdown.innerHTML = "";
        selectedSuggestionIndex = -1;
    }

    // Clear search
    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        clearSearchBtn.style.display = "none";
        hideSuggestions();
        searchInput.focus();
    });

    // Keyboard navigation in suggestions
    searchInput.addEventListener("keydown", (e) => {
        const items = autocompleteDropdown.querySelectorAll(".suggestion-item");
        if (items.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
            highlightSuggestion(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
            highlightSuggestion(items);
        } else if (e.key === "Enter") {
            if (selectedSuggestionIndex > -1) {
                e.preventDefault();
                const selectedTitle = items[selectedSuggestionIndex].dataset.title;
                searchInput.value = selectedTitle;
                hideSuggestions();
                getMovieRecommendations(selectedTitle);
            } else {
                // Recommend for whatever is typed
                const title = searchInput.value.trim();
                if (title) {
                    hideSuggestions();
                    getMovieRecommendations(title);
                }
            }
        } else if (e.key === "Escape") {
            hideSuggestions();
        }
    });

    function highlightSuggestion(items) {
        items.forEach(item => item.classList.remove("active"));
        if (selectedSuggestionIndex > -1) {
            const activeItem = items[selectedSuggestionIndex];
            activeItem.classList.add("active");
            
            // Scroll dropdown if needed
            activeItem.scrollIntoView({ block: "nearest" });
            searchInput.value = activeItem.dataset.title;
        }
    }

    // Close suggestions when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-box-wrapper")) {
            hideSuggestions();
        }
    });

    // --- Search Submission & AJAX ---
    recommendBtn.addEventListener("click", () => {
        const query = searchInput.value.trim();
        if (!query) {
            showError("Please enter a movie name.");
            return;
        }
        getMovieRecommendations(query);
    });

    async function getMovieRecommendations(movieTitle) {
        if (!movieTitle) return;
        
        showLoadingState();
        hideError();
        
        try {
            const response = await fetch("/recommend", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ movie: movieTitle })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch recommendations.");
            }

            // Success
            hideLoadingState();
            renderRecommendations(data);
            
            // Save main movie and recommendation details to locally cached DB map
            saveMovieToDatabaseMap(data.queried_movie);
            data.recommendations.forEach(rec => saveMovieToDatabaseMap(rec));
            
            // Update stats & history
            addToSearchHistory(data.queried_movie.title);
            animateStatCounter(statServedCount, data.stats.recommendations_served);
            
        } catch (error) {
            hideLoadingState();
            showError(error.message || "Movie not found. Please choose another movie.");
        }
    }

    // --- Random Movie Pick ---
    randomMovieBtn.addEventListener("click", () => {
        pickRandomAndRecommend();
    });

    function pickRandomAndRecommend(genreFilter = null) {
        if (allMovies.length === 0) return;
        
        let pool = allMovies;
        if (genreFilter) {
            // Filter using database details we have loaded
            pool = allMovies.filter(title => {
                const cached = movieDatabaseMap[title.toLowerCase()];
                return cached && cached.genre === genreFilter;
            });
            // If no cached details exist for that genre yet, fallback to full pool
            if (pool.length === 0) {
                pool = allMovies;
            }
        }

        const randomIndex = Math.floor(Math.random() * pool.length);
        const randomTitle = pool[randomIndex];
        searchInput.value = randomTitle;
        clearSearchBtn.style.display = "block";
        getMovieRecommendations(randomTitle);
    }

    // --- Render Recommendation Cards ---
    function renderRecommendations(data) {
        likedMovieTitle.textContent = data.queried_movie.title;
        recommendationsGrid.innerHTML = "";
        
        recommendationsSection.style.display = "block";
        
        data.recommendations.forEach(movie => {
            const isFav = favoriteMovies.includes(movie.title);
            
            const card = document.createElement("div");
            card.className = "movie-card";
            card.dataset.title = movie.title;
            
            card.innerHTML = `
                <div class="card-poster-wrapper">
                    <img src="${movie.poster}" alt="${movie.title}" loading="lazy">
                    <div class="similarity-badge">${movie.similarity_score}% Match</div>
                    <button class="card-fav-btn ${isFav ? 'active' : ''}" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                </div>
                <div class="card-content">
                    <div class="card-meta">
                        <span>${movie.year}</span>
                        <span class="rating-pill"><i class="fa-solid fa-star"></i> ${movie.rating}</span>
                    </div>
                    <h3 class="card-title">${movie.title}</h3>
                    <p class="card-description">${movie.overview}</p>
                </div>
            `;
            
            // Event listener for opening details modal
            card.addEventListener("click", (e) => {
                if (e.target.closest(".card-fav-btn")) {
                    e.stopPropagation();
                    toggleFavorite(movie.title, e.target.closest(".card-fav-btn"));
                    return;
                }
                openDetailsModal(movie, true);
            });
            
            recommendationsGrid.appendChild(card);
        });

        // Smooth scroll to recommendations
        recommendationsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // --- Loading & Error UI States ---
    function showLoadingState() {
        loadingSkeleton.style.display = "grid";
        recommendationsGrid.innerHTML = "";
        recommendationsSection.style.display = "block";
        likedMovieTitle.textContent = "...";
    }

    function hideLoadingState() {
        loadingSkeleton.style.display = "none";
    }

    function showError(message) {
        errorMessageText.textContent = message;
        errorPanel.style.display = "block";
        // Auto scroll to error
        errorPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function hideError() {
        errorPanel.style.display = "none";
    }

    closeErrorBtn.addEventListener("click", hideError);

    // --- Search History Logic ---
    function addToSearchHistory(title) {
        // Remove duplicate
        searchHistory = searchHistory.filter(item => item.toLowerCase() !== title.toLowerCase());
        // Add to front
        searchHistory.unshift(title);
        // Limit to 5
        searchHistory = searchHistory.slice(0, 5);
        
        localStorage.setItem("cineMatch_history", JSON.stringify(searchHistory));
        renderSearchHistory();
    }

    function renderSearchHistory() {
        recentSearchesList.innerHTML = "";
        
        if (searchHistory.length === 0) {
            recentSearchesList.innerHTML = '<p class="empty-state-text">Your search history is empty.</p>';
            return;
        }
        
        searchHistory.forEach(title => {
            const item = document.createElement("div");
            item.className = "recent-item";
            item.innerHTML = `
                <span>${title}</span>
                <i class="fa-solid fa-chevron-right"></i>
            `;
            
            item.addEventListener("click", () => {
                searchInput.value = title;
                clearSearchBtn.style.display = "block";
                getMovieRecommendations(title);
            });
            
            recentSearchesList.appendChild(item);
        });
    }

    clearHistoryBtn.addEventListener("click", () => {
        searchHistory = [];
        localStorage.removeItem("cineMatch_history");
        renderSearchHistory();
    });

    // --- Favorites Logic ---
    function toggleFavorite(title, btnElement = null) {
        let isAdded = false;
        
        if (favoriteMovies.includes(title)) {
            // Remove
            favoriteMovies = favoriteMovies.filter(t => t !== title);
            if (btnElement) {
                btnElement.classList.remove("active");
                btnElement.title = "Add to Favorites";
            }
        } else {
            // Add
            favoriteMovies.push(title);
            isAdded = true;
            if (btnElement) {
                btnElement.classList.add("active");
                btnElement.title = "Remove from Favorites";
            }
        }
        
        localStorage.setItem("cineMatch_favorites", JSON.stringify(favoriteMovies));
        renderFavorites();
        
        // Update modal favorite button state if it's currently showing this movie
        if (detailsModal.style.display === "flex" && modalMovieTitle.textContent === title) {
            updateModalFavButtonState(title);
        }
        
        // Also update any matching cards in the recommendation grid
        const cards = recommendationsGrid.querySelectorAll(".movie-card");
        cards.forEach(card => {
            if (card.dataset.title === title) {
                const favBtn = card.querySelector(".card-fav-btn");
                if (favBtn) {
                    if (isAdded) {
                        favBtn.classList.add("active");
                    } else {
                        favBtn.classList.remove("active");
                    }
                }
            }
        });
    }

    function renderFavorites() {
        favoritesGrid.innerHTML = "";
        
        if (favoriteMovies.length === 0) {
            favoritesGrid.innerHTML = '<p class="empty-state-text">No favorites added yet. Click on any card to add it to your list!</p>';
            return;
        }
        
        favoriteMovies.forEach(title => {
            const cached = movieDatabaseMap[title.toLowerCase()];
            const poster = cached ? cached.poster : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=100";
            const genre = cached ? cached.genre : "Movie";

            const item = document.createElement("div");
            item.className = "fav-card-compact";
            item.innerHTML = `
                <img src="${poster}" alt="${title}">
                <div class="fav-compact-info">
                    <div class="fav-compact-title">${title}</div>
                    <div class="fav-compact-genre">${genre}</div>
                </div>
            `;
            
            item.addEventListener("click", () => {
                // Open modal using cached details or placeholder
                if (cached) {
                    openDetailsModal(cached, false);
                } else {
                    // Fallback to fetch recommendations to get detailed info
                    searchInput.value = title;
                    getMovieRecommendations(title);
                }
            });
            
            favoritesGrid.appendChild(item);
        });
    }

    // --- Details Modal Handlers ---
    function updateModalFavButtonState(title) {
        if (favoriteMovies.includes(title)) {
            modalFavoriteBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Favorited';
            modalFavoriteBtn.classList.add("primary-btn");
            modalFavoriteBtn.classList.remove("secondary-btn");
        } else {
            modalFavoriteBtn.innerHTML = '<i class="fa-regular fa-heart"></i> Add to Favorites';
            modalFavoriteBtn.classList.add("secondary-btn");
            modalFavoriteBtn.classList.remove("primary-btn");
        }
    }

    function openDetailsModal(movie, isRecommendation = false) {
        modalMovieTitle.textContent = movie.title;
        modalMoviePoster.src = movie.poster;
        modalMoviePoster.alt = movie.title;
        modalMovieYear.textContent = movie.year;
        modalMovieGenre.textContent = movie.genre;
        modalMovieRating.textContent = movie.rating;
        modalMovieDescription.textContent = movie.overview;
        
        // Handle similarity badge
        if (isRecommendation && movie.similarity_score !== undefined) {
            modalSimilarityPercentage.textContent = `${movie.similarity_score}%`;
            modalSimilarityBadge.style.display = "block";
        } else {
            modalSimilarityBadge.style.display = "none";
        }
        
        // Favorite button state
        updateModalFavButtonState(movie.title);
        
        // Setup "Add to Favorites" event inside modal
        // Remove previous event listeners by cloning button
        const newFavBtn = modalFavoriteBtn.cloneNode(true);
        modalFavoriteBtn.parentNode.replaceChild(newFavBtn, modalFavoriteBtn);
        
        // Assign new reference
        document.getElementById("modal-favorite-btn").addEventListener("click", () => {
            toggleFavorite(movie.title);
        });
        
        // Setup "Find Similar" direct search inside modal
        const newRecommendBtn = modalRecommendDirectBtn.cloneNode(true);
        modalRecommendDirectBtn.parentNode.replaceChild(newRecommendBtn, modalRecommendDirectBtn);
        
        document.getElementById("modal-recommend-direct-btn").addEventListener("click", () => {
            closeModal();
            searchInput.value = movie.title;
            clearSearchBtn.style.display = "block";
            getMovieRecommendations(movie.title);
        });

        // Load 5 related movies inside the modal to offer seamless discovery
        fetchModalRelatedMovies(movie.title);

        detailsModal.style.display = "flex";
        body.style.overflow = "hidden"; // disable background scrolling
    }

    async function fetchModalRelatedMovies(title) {
        modalRelatedGrid.innerHTML = '<div style="grid-column: span 5; text-align: center; font-size: 11px; color: var(--text-muted);">Loading recommendations...</div>';
        
        try {
            const response = await fetch("/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ movie: title })
            });
            
            if (!response.ok) throw new Error("Failed to load related");
            const data = await response.json();
            
            modalRelatedGrid.innerHTML = "";
            
            data.recommendations.forEach(rec => {
                saveMovieToDatabaseMap(rec);
                
                const card = document.createElement("div");
                card.className = "modal-related-card";
                card.innerHTML = `
                    <img src="${rec.poster}" alt="${rec.title}">
                    <div class="modal-related-title">${rec.title}</div>
                `;
                
                card.addEventListener("click", () => {
                    // Recursively load this movie inside the modal
                    openDetailsModal(rec, true);
                });
                
                modalRelatedGrid.appendChild(card);
            });
        } catch (e) {
            modalRelatedGrid.innerHTML = '<div style="grid-column: span 5; text-align: center; font-size: 11px; color: var(--text-muted);">No recommendations available.</div>';
        }
    }

    function closeModal() {
        detailsModal.style.display = "none";
        body.style.overflow = ""; // enable scrolling
    }

    closeModalBtn.addEventListener("click", closeModal);
    
    // Close modal when clicking outside content
    detailsModal.addEventListener("click", (e) => {
        if (e.target === detailsModal) {
            closeModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && detailsModal.style.display === "flex") {
            closeModal();
        }
    });
});
