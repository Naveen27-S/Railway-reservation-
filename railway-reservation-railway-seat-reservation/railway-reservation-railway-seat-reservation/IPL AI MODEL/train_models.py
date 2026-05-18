import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib

# ---------------------- Load Data ----------------------
batting_data = pd.read_csv('batting_data.csv')  # General career batting stats
bowling_data = pd.read_csv('bowling_data.csv')  # Career bowling stats
venue_batting_data = pd.read_csv('batting_data_venue.csv')  # Batting stats by venue

# ---------------------- Clean Batting Data ----------------------
batting_data.replace('-', pd.NA, inplace=True)
batting_data = batting_data.apply(pd.to_numeric, errors='coerce')
batting_data.fillna(0, inplace=True)

# ---------------------- Batting Model (Career Stats) ----------------------
X_batting = batting_data[['Mat', 'Inns', 'NO', 'HS', 'BF', 'SR']]
y_batting = batting_data['Runs']

X_b_train, X_b_test, y_b_train, y_b_test = train_test_split(X_batting, y_batting, test_size=0.2, random_state=42)

batting_model = RandomForestRegressor(n_estimators=100, random_state=42)
batting_model.fit(X_b_train, y_b_train)

batting_y_pred = batting_model.predict(X_b_test)
print("Career Batting Model:")
print("MSE:", mean_squared_error(y_b_test, batting_y_pred))
print("R2:", r2_score(y_b_test, batting_y_pred))

joblib.dump(batting_model, 'batting_model.pkl')

# ---------------------- Clean Bowling Data ----------------------
bowling_data.replace('-', pd.NA, inplace=True)
bowling_data = bowling_data.apply(pd.to_numeric, errors='coerce')
bowling_data.fillna(0, inplace=True)

# ---------------------- Bowling Model ----------------------
X_bowling = bowling_data[['Mat', 'Inns', 'Runs', 'Wkts', 'Econ', 'SR']]
y_bowling = bowling_data['Wkts']

X_bw_train, X_bw_test, y_bw_train, y_bw_test = train_test_split(X_bowling, y_bowling, test_size=0.2, random_state=42)

bowling_model = RandomForestRegressor(n_estimators=100, random_state=42)
bowling_model.fit(X_bw_train, y_bw_train)

bowling_y_pred = bowling_model.predict(X_bw_test)
print("Bowling Model:")
print("MSE:", mean_squared_error(y_bw_test, bowling_y_pred))
print("R2:", r2_score(y_bw_test, bowling_y_pred))

joblib.dump(bowling_model, 'bowling_model.pkl')

# ---------------------- Clean Venue-wise Batting Data ----------------------
venue_batting_data.replace('-', pd.NA, inplace=True)
venue_batting_data = venue_batting_data.apply(pd.to_numeric, errors='coerce')
venue_batting_data.fillna(0, inplace=True)

# ---------------------- Venue-Based Batting Model ----------------------
# You may want to select relevant venue-based stats (e.g., Mat, Inns, BF, SR at specific venues)
venue_features = [col for col in venue_batting_data.columns if 'venue' in col.lower()]
X_venue = venue_batting_data[venue_features]
y_venue = venue_batting_data['Runs']  # assuming target remains total runs at that venue

X_v_train, X_v_test, y_v_train, y_v_test = train_test_split(X_venue, y_venue, test_size=0.2, random_state=42)

venue_batting_model = RandomForestRegressor(n_estimators=100, random_state=42)
venue_batting_model.fit(X_v_train, y_v_train)

venue_y_pred = venue_batting_model.predict(X_v_test)
print("Venue-wise Batting Model:")
print("MSE:", mean_squared_error(y_v_test, venue_y_pred))
print("R2:", r2_score(y_v_test, venue_y_pred))

joblib.dump(venue_batting_model, 'venue_batting_model.pkl')

# ---------------------- Combined Model (Career + Bowling + Venue) ----------------------

# Reload Player names from original CSVs to add to cleaned data
batting_data['Player'] = pd.read_csv('batting_data.csv')['Player']
bowling_data['Player'] = pd.read_csv('bowling_data.csv')['Player']
venue_batting_data['Player'] = pd.read_csv('batting_data_venue.csv')['Player']

# Merge all datasets
combined_data = pd.merge(batting_data, bowling_data, on='Player', suffixes=('_bat', '_bowl'))
combined_data = pd.merge(combined_data, venue_batting_data, on='Player', suffixes=('', '_venue'))

# Select combined features (ensure columns exist)
combined_features = [
    'Mat_bat', 'Inns_bat', 'NO_bat', 'HS_bat', 'BF_bat', 'SR_bat',
    'Mat_bowl', 'Inns_bowl', 'Runs_bowl', 'Wkts_bowl', 'Econ_bowl', 'SR_bowl',
    'BF', 'SR', '4s', '6s'  # from venue batting
]

# Filter features that are present in the combined data
combined_features = [f for f in combined_features if f in combined_data.columns]

X_combined = combined_data[combined_features]
y_combined = combined_data['Runs']  # Target can also be 'Runs_venue' if preferred

# Train-test split
X_c_train, X_c_test, y_c_train, y_c_test = train_test_split(X_combined, y_combined, test_size=0.2, random_state=42)

# Train the combined model
combined_model = RandomForestRegressor(n_estimators=100, random_state=42)
combined_model.fit(X_c_train, y_c_train)

combined_y_pred = combined_model.predict(X_c_test)

# Evaluation
print("Combined Model (Career + Bowling + Venue):")
print("MSE:", mean_squared_error(y_c_test, combined_y_pred))
print("R2:", r2_score(y_c_test, combined_y_pred))

# Save model
joblib.dump(combined_model, 'combined_model.pkl')

print("\nAll models saved: 'batting_model.pkl', 'bowling_model.pkl', 'venue_batting_model.pkl', 'combined_model.pkl'")
