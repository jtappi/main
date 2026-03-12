document.addEventListener('DOMContentLoaded', () => {
    const BASE = '/trackmyweek';

    fetch(`${BASE}/data`)
        .then(response => response.json())
        .then(data => { analyzeData(data); })
        .catch(error => console.error('Error fetching data:', error));

    document.querySelectorAll('#category-counts-table th').forEach((header, index) => {
        header.addEventListener('click', () => sortTable('category-counts-table', index));
    });
    document.querySelectorAll('#text-counts-table th').forEach((header, index) => {
        header.addEventListener('click', () => sortTable('text-counts-table', index));
    });
    document.getElementById('categoryTitle').addEventListener('click', () => toggleTableVisibility('category-counts-table'));
    document.getElementById('nameTitle').addEventListener('click',     () => toggleTableVisibility('text-counts-table'));

    function analyzeData(data) {
        const categoryCounts = {};
        const textCounts = {};
        const dateCounts = {};
        let lastEntryDate = null;
        let entryTime = null;

        data.forEach(item => {
            const category = item.category || 'Uncategorized';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            const text = item.text || 'Untitled';
            textCounts[text] = (textCounts[text] || 0) + 1;
            const date = item.timestamp.split('T')[0];
            dateCounts[date] = (dateCounts[date] || 0) + 1;
            entryTime = item.month + ' ' + new Date(item.timestamp).getDate() + ' @ ' + item.time;
            if (!lastEntryDate || item.timestamp > lastEntryDate) lastEntryDate = item.timestamp;
        });

        const totalDays = Object.keys(dateCounts).length;
        document.getElementById('average-entries-per-day').textContent =
            totalDays ? (data.length / totalDays).toFixed(2) : '0';
        document.getElementById('last-entry-date-time').textContent = entryTime || 'No entries';

        const categoryBody = document.getElementById('category-counts-table').querySelector('tbody');
        for (const [category, count] of Object.entries(categoryCounts)) {
            const row = categoryBody.insertRow();
            row.insertCell(0).textContent = category;
            row.insertCell(1).textContent = count;
        }

        const textBody = document.getElementById('text-counts-table').querySelector('tbody');
        for (const [text, count] of Object.entries(textCounts)) {
            const row = textBody.insertRow();
            row.insertCell(0).textContent = text;
            row.insertCell(1).textContent = count;
        }
    }

    function sortTable(tableId, columnIndex) {
        const table = document.getElementById(tableId);
        const tbody = table.tBodies[0];
        const rows  = Array.from(tbody.rows);
        const isAsc = table.getAttribute('data-sort-asc') === 'true';
        rows.sort((a, b) => {
            const aText = a.cells[columnIndex].textContent.trim();
            const bText = b.cells[columnIndex].textContent.trim();
            return (isAsc ? 1 : -1) * (!isNaN(aText) && !isNaN(bText)
                ? aText - bText
                : aText.localeCompare(bText));
        });
        rows.forEach(row => tbody.appendChild(row));
        table.setAttribute('data-sort-asc', !isAsc);
    }

    function toggleTableVisibility(tableId) {
        const table = document.getElementById(tableId);
        table.style.display = table.style.display === 'none' ? 'table' : 'none';
    }
});
