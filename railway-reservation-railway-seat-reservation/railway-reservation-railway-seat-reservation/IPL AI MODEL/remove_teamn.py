import pandas as pd
import re

# Load Excel with correct header row
df = pd.read_excel(r'D:\IPL AI MODEL\batting stats with venue.xlsx', header=1)

# Debug: Show actual column names
print("Actual columns:", df.columns.tolist())

# Drop rows that don't have match data
df = df[df['Mat'].notna()]  # 'Mat' will now exist

# Remove team info in parentheses from Player names
def remove_team_details(name):
    return re.sub(r'\(.*?\)', '', str(name)).strip()

df['Player'] = df['Player'].apply(remove_team_details)

# Save cleaned data
df.to_csv(r'D:\IPL AI MODEL\cleaned_batting_stats with venue.csv', index=False)

print(df.head())

