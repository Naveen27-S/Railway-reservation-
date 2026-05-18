import pandas as pd

# Player data
data = {
    "Player Name": [
        # GT Playing XI
        "Sai Sudharsan", "Shubman Gill", "Jos Buttler", "Washington Sundar",
        "Shahrukh Khan", "Rahul Tewatia", "Karim Janat", "Rashid Khan",
        "Sai Kishore", "Mohammed Siraj", "Prasidh Krishna",

        # GT Substitutes
        "Ishant Sharma", "Mahipal Lomror", "Anuj Rawat", "Arshad Khan", "Dasun Shanaka",

        # SRH Playing XI
        "Abhishek Sharma", "Ishan Kishan", "Nitish Kumar Reddy", "Henrich Klaasen",
        "Aniket Verma", "Kamindu Mendis", "Pat Cummins", "Harshal Patel",
        "Jaydev Unadkat", "Zeeshan Ansari", "Mohammed Shami",

        # SRH Substitutes
        "Abhinav Manohar", "Sachin Baby", "Travis Head", "Rahul Chahar", "Wiaan Mulder"
    ],
    "Role": [
        # GT Playing XI
        "Batter", "Batter", "WK-Batter", "Bowling Allrounder",
        "Batting Allrounder", "Batting Allrounder", "Bowling Allrounder", "Bowling Allrounder",
        "Bowling Allrounder", "Bowler", "Bowler",

        # GT Substitutes
        "Bowler", "Batting Allrounder", "WK-Batter", "Bowling Allrounder", "Batting Allrounder",

        # SRH Playing XI
        "Batting Allrounder", "WK-Batter", "Batting Allrounder", "WK-Batter",
        "Batter", "Batting Allrounder", "Bowler", "Bowler",
        "Bowler", "Bowler", "Bowler",

        # SRH Substitutes
        "Batter", "Batter", "Batter", "Bowler", "Bowling Allrounder"
    ]
}

# Match-wide info
venue = "Narendra Modi Stadium"
toss_winner = "PBKS"

# Create DataFrame
df = pd.DataFrame(data)

# Add venue and toss winner for all rows
df['Venue'] = venue
df['Toss Winner'] = toss_winner

# Save to CSV
df.to_csv('team_players.csv', index=False)

print("team_players.csv with full venue and toss winner info has been created.")
