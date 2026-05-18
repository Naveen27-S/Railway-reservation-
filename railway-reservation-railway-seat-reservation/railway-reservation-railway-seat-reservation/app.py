from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_mysqldb import MySQL

app = Flask(__name__)
app.secret_key = 'your_secret_key'

# MySQL Configuration
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'Bhuvi'
app.config['MYSQL_PASSWORD'] = '12345'
app.config['MYSQL_DB'] = 'railway_reservation'

mysql = MySQL(app)

@app.route('/')
def home():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM trains")
    trains = cur.fetchall()
    cur.close()
    
    return render_template('index.html', trains=trains)

@app.route('/search', methods=['POST'])
def search():
    source = request.form['source']
    destination = request.form['destination']
    
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM trains WHERE source LIKE %s AND destination LIKE %s",
                ('%' + source + '%', '%' + destination + '%'))
    trains = cur.fetchall()
    cur.close()
    
    return render_template('train_list.html', trains=trains)

@app.route('/get_seats/<int:train_id>')
def get_seats(train_id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT id, seat_number, seat_class, is_booked FROM seats WHERE train_id = %s", (train_id,))
    seats = cur.fetchall()
    cur.close()
    
    seat_list = [{'id': s[0], 'seat_number': s[1], 'seat_class': s[2], 'is_booked': s[3]} for s in seats]
    return jsonify(seats=seat_list)

@app.route('/book_ticket/<int:train_id>', methods=['GET', 'POST'])
def book_ticket(train_id):
    if 'user' not in session:
        return redirect(url_for('login'))
    
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM trains WHERE id = %s", (train_id,))
    train = cur.fetchone()
    cur.close()

    if not train:
        flash('Train not found!', 'danger')
        return redirect(url_for('home'))

    if request.method == 'POST':
        name = request.form['name']
        age = request.form['age']
        seat_id = request.form['seat_no']
        date = request.form['date']
        username = session['user']
        
        cur = mysql.connection.cursor()
        cur.execute("SELECT is_booked FROM seats WHERE id = %s", (seat_id,))
        seat = cur.fetchone()

        if seat and seat[0] == 1:
            flash("Seat already booked! Please choose another seat.", "danger")
            cur.close()
            return redirect(url_for('book_ticket', train_id=train_id))

        # Book the seat and store name
        cur.execute("""UPDATE seats 
                       SET is_booked = 1, name = %s, booked_by = %s
                       WHERE id = %s""", (name, username, seat_id))
        mysql.connection.commit()

        # Fetch booking confirmation details
        cur.execute("""SELECT t.name AS train_name, s.seat_number, s.seat_class, %s AS booking_date
                       FROM seats s
                       JOIN trains t ON s.train_id = t.id
                       WHERE s.id = %s""", (date, seat_id))
        row = cur.fetchone()
        cur.close()

        booked_ticket = {
            'train_name': row[0],
            'seat_number': row[1],
            'seat_class': row[2],
            'booking_date': row[3],
            'passenger_name': name,
            'passenger_age': age
        }

        flash("Ticket booked successfully!", "success")
        return render_template('book_ticket.html', train=train, booked_ticket=booked_ticket)

    return render_template('book_ticket.html', train=train)

@app.route('/cancel')
def cancel():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    cur = mysql.connection.cursor()
    cur.execute("""SELECT s.id, t.name, s.seat_number, s.seat_class
                   FROM seats s
                   JOIN trains t ON s.train_id = t.id
                   WHERE s.is_booked = 1 AND s.booked_by = %s""", (session['user'],))
    bookings = cur.fetchall()
    cur.close()
    
    return render_template('cancel_ticket.html', tickets=bookings)

@app.route('/cancel_ticket', methods=['POST'])
def cancel_ticket():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    booking_id = request.form['booking_id']
    cur = mysql.connection.cursor()
    cur.execute("UPDATE seats SET is_booked = 0, name = NULL, booked_by = NULL WHERE id = %s", (booking_id,))
    mysql.connection.commit()
    cur.close()
    
    flash("Ticket cancelled successfully!", "info")
    return redirect(url_for('cancel'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            flash('Username already taken!', 'danger')
            return redirect(url_for('register'))
        
        cur.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, password))
        mysql.connection.commit()
        cur.close()
        
        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s AND password = %s", (username, password))
        user = cur.fetchone()
        cur.close()
        
        if user:
            session['user'] = username
            flash('Logged in successfully.', 'success')
            return redirect(url_for('home'))
        else:
            flash('Invalid credentials', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    flash('Logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/select_train')
def select_train():
    cur = mysql.connection.cursor()
    cur.execute("SELECT id, name FROM trains")
    trains = cur.fetchall()
    cur.close()
    
    return render_template('select_train.html', trains=trains)

@app.route('/status')
def status():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    username = session['user']
    cur = mysql.connection.cursor()
    cur.execute(""" 
        SELECT DISTINCT t.id, t.name, t.source, t.destination, t.departure_time
        FROM seats s
        JOIN trains t ON s.train_id = t.id
        WHERE s.booked_by = %s
    """, (username,))
    booked_trains = cur.fetchall()
    cur.close()
    
    return render_template('booking_status.html', trains=booked_trains)

@app.route('/train_details/<int:train_id>')
def train_details(train_id):
    if 'user' not in session:
        return redirect(url_for('login'))
    
    user_name = session['user']
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM trains WHERE id = %s", (train_id,))
    train = cur.fetchone()
    cur.close()
    
    return render_template('train_details.html', train=train, user_name=user_name)

if __name__ == '__main__':
    app.run(debug=True)
