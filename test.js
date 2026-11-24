// ReviewMate PR test
function authenticateUser(username, password) {
  // SQL Injection vulnerability test
  const query = "SELECT * FROM users WHERE user = '" + username + "' AND pass = '" + password + "'";
  return db.query(query);
}
