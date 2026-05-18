import pandas as pd

# Player data
data = {
    "Player Name": [
        # RR Playing XI
        "Yashasvi Jaiswal", "Vaibhav Suryavanshi", "Sanju Samson", "Riyan Parag",
        "Shimron Hetmyer", "Dhruv Jurel", "Wanindu Hasaranga", "Kwena Maphaka",
        "Tushar Deshpande", "Akash Madhwal", "Fazalhaq Farooqi",

        # PBKS Playing XI
        "Priyansh Arya", "Prabhsimran Singh", "Shreyas Iyer", "Shashank Singh",
        "Nehal Wadhera", "Mitchell Owen", "Azmatullah Omarzai", "Marco Jansen",
        "Xavier Bartlett", "Arshdeep Singh", "Yuzvendra Chahal",

        # Substitutes
        "Shubham Dubey", "Yudhvir Singh Charak", "Kumar Kartikeya", "Ashok Sharma",
        "Kunal Singh Rathore", "Harpreet Brar", "Praveen Dubey", "Suryansh Shedge",
        "Vijaykumar Vyshak", "Musheer Khan"
    ],
    "Role": [
        # RR Playing XI
        "Batter", "Batter", "WK-Batter", "Batting Allrounder",
        "Batter", "WK-Batter", "Bowling Allrounder", "Bowler",
        "Bowler", "Bowler", "Bowler",

        # PBKS Playing XI
        "Batter", "WK-Batter", "Batter", "Batting Allrounder",
        "Batter", "Batting Allrounder", "Bowling Allrounder", "Bowling Allrounder",
        "Bowler", "Bowler", "Bowler",

        # Substitutes
        "Batter", "Bowler", "Bowler", "Bowler",
        "WK-Batter", "Bowler", "Bowling Allrounder", "Batting Allrounder",
        "Bowler", "Batter"
    ]
}

# Match-wide info
venue = "Sawai Mansingh Stadium"
toss_winner = "PBKS"

# Create DataFrame
df = pd.DataFrame(data)

# Add venue and toss winner for all rows
df['Venue'] = venue
df['Toss Winner'] = toss_winner

# Save to CSV
df.to_csv('team_players.csv', index=False)

print("team_players_rr_pbks.csv has been created with RR vs PBKS player data, venue, and toss winner.")
