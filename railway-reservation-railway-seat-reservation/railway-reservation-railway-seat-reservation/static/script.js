function searchTrains() {
    const source = document.getElementById('source').value.toLowerCase();
    const dest = document.getElementById('destination').value.toLowerCase();
    const rows = document.querySelectorAll('#trainTable tbody tr');
  
    rows.forEach(row => {
      const src = row.children[1].textContent.toLowerCase();
      const dst = row.children[2].textContent.toLowerCase();
  
      if (
        (source === "" || src.includes(source)) &&
        (dest === "" || dst.includes(dest))
      ) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }
  