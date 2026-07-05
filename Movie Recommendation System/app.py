import os
from flask import Flask, render_template, request, jsonify
from utils.recommendation import init_recommendation, get_recommendations

app = Flask(__name__)

# Track recommendations generated since server startup
recommendations_count = 0

# Pre-train the recommendation model on server start to verify files
# and create models/similarity.pkl and models/movies.pkl if they don't exist
print("Initializing recommendation model...")
try:
    df_data, _ = init_recommendation()
    print(f"Model initialized successfully. Loaded {len(df_data)} movies.")
except Exception as e:
    print(f"Model pre-initialization failed: {e}")
    df_data = None

@app.route("/")
def home():
    """Renders the Movie Recommendation System homepage."""
    return render_template("index.html")

@app.route("/movies", methods=["GET"])
def get_movies():
    """
    Returns lists of movie names for autocomplete, list of genres,
    and statistics for the animated count displays.
    """
    global df_data
    if df_data is None:
        try:
            df_data, _ = init_recommendation()
        except Exception as e:
            return jsonify({"error": f"Failed to load dataset: {e}"}), 500

    # Get sorted list of movie titles
    movie_titles = sorted(df_data["title"].tolist())
    
    # Get list of unique genres
    genres = sorted(df_data["genre"].dropna().unique().tolist())
    
    # Send stats data
    stats = {
        "total_movies": len(df_data),
        "total_genres": len(genres),
        "recommendations_served": recommendations_count
    }
    
    return jsonify({
        "movies": movie_titles,
        "genres": genres,
        "stats": stats
    })

@app.route("/recommend", methods=["POST"])
def recommend():
    """
    POST route that expects JSON input with a 'movie' key.
    Calculates and returns the top 5 similar movies.
    """
    global recommendations_count
    data = request.get_json()
    
    if not data or "movie" not in data or not data["movie"].strip():
        return jsonify({"error": "Please enter a movie name."}), 400
        
    movie_title = data["movie"].strip()
    
    success, result = get_recommendations(movie_title)
    
    if not success:
        return jsonify({"error": result}), 404
        
    # Increment our recommendations served statistic counter
    recommendations_count += 1
    
    # Return recommendations
    return jsonify({
        "queried_movie": result["queried_movie"],
        "recommendations": result["recommendations"],
        "stats": {
            "recommendations_served": recommendations_count
        }
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug_mode, host="0.0.0.0", port=port)
