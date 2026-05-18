import pandas as pd
import joblib
from rapidfuzz import process

# Load models
batting_model = joblib.load('batting_model.pkl')
bowling_model = joblib.load('bowling_model.pkl')
venue_batting_model = joblib.load('venue_batting_model.pkl')

# Load data
batting_data = pd.read_csv('batting_data.csv')
bowling_data = pd.read_csv('bowling_data.csv')
venue_batting_data = pd.read_csv('batting_data_venue.csv')
team_data = pd.read_csv('team_players.csv')

# Extract venue and toss winner
current_venue = team_data.iloc[0]['Venue']
toss_winner = team_data.iloc[0]['Toss Winner']

# Clean data
batting_data['HS'] = batting_data['HS'].replace(r'\*', '', regex=True).replace('-', float('nan')).astype(float)
batting_data[['Mat', 'Inns', 'NO', 'HS', 'BF', 'SR']] = batting_data[['Mat', 'Inns', 'NO', 'HS', 'BF', 'SR']].apply(pd.to_numeric, errors='coerce')
bowling_data[['Mat', 'Inns', 'Runs', 'Wkts', 'Econ', 'SR']] = bowling_data[['Mat', 'Inns', 'Runs', 'Wkts', 'Econ', 'SR']].apply(pd.to_numeric, errors='coerce')
venue_batting_data['HS'] = venue_batting_data['HS'].replace(r'\*', '', regex=True).replace('-', float('nan')).astype(float)
venue_batting_data = venue_batting_data.apply(pd.to_numeric, errors='coerce')
venue_batting_data.fillna(0, inplace=True)

# Fuzzy matching
def get_best_match(name, choices):
    match = process.extractOne(name, choices, score_cutoff=80)
    return match[0] if match else None

# Prepare fuzzy match pools
all_batting_names = [str(name) for name in batting_data['Player'].dropna()]
all_bowling_names = [str(name) for name in bowling_data['Player'].dropna()]
all_venue_batting_names = [str(name) for name in venue_batting_data['Player'].dropna()]

players = []
wk_batters = []

for _, player in team_data.iterrows():
    player_name = player['Player Name']
    role = player['Role']

    # --- Batting prediction (venue-specific if available) ---
    matched_venue_batting = get_best_match(player_name, all_venue_batting_names)
    venue_batting_row = venue_batting_data[
        (venue_batting_data['Player'] == matched_venue_batting) & 
        (venue_batting_data['venue'] == current_venue)
    ]

    if not venue_batting_row.empty:
        batting_features = ['Mat', 'Inns', 'NO', 'HS', 'BF', 'SR']
        player_pred_runs = venue_batting_model.predict(venue_batting_row[batting_features])[0]
    else:
        matched_batting = get_best_match(player_name, all_batting_names)
        global_batting_row = batting_data[batting_data['Player'] == matched_batting]
        player_pred_runs = batting_model.predict(global_batting_row[['Mat', 'Inns', 'NO', 'HS', 'BF', 'SR']])[0] if not global_batting_row.empty else 0

    # --- Bowling prediction (global only) ---
    matched_bowling = get_best_match(player_name, all_bowling_names)
    global_bowling_row = bowling_data[bowling_data['Player'] == matched_bowling]
    player_pred_wickets = bowling_model.predict(global_bowling_row[['Mat', 'Inns', 'Runs', 'Wkts', 'Econ', 'SR']])[0] if not global_bowling_row.empty else 0

    # --- Toss boost ---
    toss_boost = 1.10 if toss_winner and toss_winner in player_name else 1.00

    # --- Score calculation ---
    if role in ['Batting Allrounder', 'Bowling Allrounder']:
        performance_score = (player_pred_runs + (player_pred_wickets * 10)) * toss_boost
    elif role == 'Batter' or role == 'WK-Batter':
        performance_score = player_pred_runs * toss_boost
    else:
        performance_score = (player_pred_wickets * 10) * toss_boost

    player_record = {
        'Player Name': player_name,
        'Performance Score': round(performance_score, 2),
        'Role': role
    }

    players.append(player_record)

    if role == 'WK-Batter':
        wk_batters.append(player_record)

# --- Ensure at least 1 WK-Batter in top 11 ---
sorted_players = sorted(players, key=lambda x: x['Performance Score'], reverse=True)
playing_xi = []

# Pick top WK-Batter first
if wk_batters:
    best_wk = sorted(wk_batters, key=lambda x: x['Performance Score'], reverse=True)[0]
    playing_xi.append(best_wk)
    used_names = {best_wk['Player Name']}
else:
    print("⚠️ No WK-Batter available in team!")

# Fill the rest of the team
for player in sorted_players:
    if player['Player Name'] not in [p['Player Name'] for p in playing_xi]:
        playing_xi.append(player)
    if len(playing_xi) == 11:
        break

# --- Captain and Vice-Captain ---
captain = playing_xi[0]['Player Name']
vice_captain = playing_xi[1]['Player Name']

# --- Output ---
print("\nPredicted Playing XI (Venue Batting + Global Bowling):")
print(f"Captain: {captain}")
print(f"Vice-Captain: {vice_captain}")
print("\nOther Players:")
for player in playing_xi[2:]:
    print(f"{player['Player Name']} - {player['Role']} (Score: {player['Performance Score']})")
