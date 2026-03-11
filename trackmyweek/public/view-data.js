document.addEventListener('DOMContentLoaded', () => {
const CATEGORIES = ['Home', 'Medication', 'Bill', 'Health', 'Pain', 'Food', 'TO DO', 'Exercise'];

fetch('/data')
        .then(response => response.json())
        .then(data => {
            data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const tbody = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
            const resetBtn = document.getElementById('resetBtn');
            const overlay = document.getElementById('overlay');
            let filteredData = data;

            const renderTable = () => {
                const tableBody = document.getElementById('table-body');
                tableBody.innerHTML = '';
                filteredData.forEach((item, index) => {
                    const row = tbody.insertRow();
                    row.insertCell(0).textContent = item.text;
                    row.cells[0].setAttribute('id', 'text-cell');
                    row.insertCell(1).textContent = item.category || '';
                    row.cells[1].setAttribute('id', 'category-cell');
                    row.insertCell(2).textContent = item.cost || '';
                    row.cells[2].setAttribute('id', 'cost-cell');
                    const notesCell = row.insertCell(3);
                    notesCell.setAttribute('id', 'notes-cell');
                    const notesText = item.notes || '';
                    notesCell.textContent = notesText.length > 20 ? notesText.substring(0, 20) + '...' : notesText;
                    row.insertCell(4).textContent = item.day;
                    row.cells[4].setAttribute('id', 'day-cell');
                    row.insertCell(5).textContent = item.month + ' ' + new Date(item.timestamp).getDate();
                    row.cells[5].setAttribute('id', 'month-cell');
                    const timeCell = row.insertCell(6);
                    timeCell.setAttribute('id', 'time-cell');
                    timeCell.textContent = item.time;
                    const actionsCell = row.insertCell(7);
                    actionsCell.setAttribute('id', 'actions-cell');
                    actionsCell.innerHTML = `
                        <i class="fas fa-edit edit-icon" data-index="${index}"></i>
                        <i class="fas fa-trash-alt delete-icon" data-index="${index}"></i>
                        <i class="fas fa-save save-icon d-none" data-index="${index}"></i>
                        <i class="fas fa-undo undo-icon d-none" data-index="${index}"></i>
                    `;
                    Array.from(row.cells).forEach((cell, cellIndex) => {
                        const columnId = document.querySelector(`th:nth-child(${cellIndex + 1})`).id;
                        if (columnId !== 'notes-header' && columnId !== 'actions-header') {
                            cell.addEventListener('click', filterHandler);
                        }
                    });
                });
            };

            const filterHandler = (event) => {
                const cell = event.currentTarget;
                const column = cell.parentElement.parentElement.parentElement.querySelector(`th:nth-child(${cell.cellIndex + 1})`).getAttribute('data-column');
                const value = cell.textContent;
                filterData(column, value);
            };

            renderTable();

            tbody.addEventListener('click', (event) => {
                const target = event.target;
                const index = target.getAttribute('data-index');
                if (target.classList.contains('edit-icon'))   editRow(index);
                else if (target.classList.contains('save-icon'))   saveRow(index);
                else if (target.classList.contains('undo-icon'))   undoRow(index);
                else if (target.classList.contains('delete-icon')) confirmDelete(index);
            });

            function getTimestampById(index) {
                const item = data[index];
                return item ? item.timestamp : null;
            }

            function editRow(index) {
                const row = tbody.rows[index];
                const timestamp = new Date(getTimestampById(index));
                const dateInput = document.createElement('input');
                dateInput.type = 'datetime-local';
                dateInput.id = 'entryDate';
                dateInput.className = 'form-control';
                const formatter = new Intl.DateTimeFormat('en-CA', {
                    timeZone: 'America/New_York',
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', hour12: false
                });
                dateInput.value = formatter.format(timestamp).replace(/\//g, '-').replace(', ', 'T');
                row.classList.add('editing-row');
                const categoryCell = row.cells[1];
                const currentCategory = categoryCell.textContent;
                const select = document.createElement('select');
                select.className = 'form-control category-select';
                CATEGORIES.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    if (category === currentCategory) option.selected = true;
                    select.appendChild(option);
                });
                categoryCell.textContent = '';
                categoryCell.appendChild(select);
                categoryCell.contentEditable = false;
                const nonEditableIds = ['time-cell', 'actions-cell', 'month-cell', 'day-cell'];
                for (let i = 0; i < row.cells.length - 1; i++) {
                    if (!nonEditableIds.includes(row.cells[i].id)) row.cells[i].contentEditable = 'true';
                    if (row.cells[i].id === 'time-cell') {
                        row.cells[i].innerHTML = '';
                        row.cells[i].appendChild(dateInput);
                    }
                    row.cells[i].removeEventListener('click', filterHandler);
                }
                toggleIcons(row, true);
                Array.from(tbody.rows).forEach((r, i) => { if (i !== index) r.classList.add('blur'); });
                overlay.classList.remove('d-none');
            }

            function toISOStringEST(date) {
                const formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'America/New_York',
                    year: 'numeric', month: '2-digit', day: 'numeric',
                    hour: 'numeric', minute: 'numeric', second: 'numeric'
                });
                return formatter.format(new Date(date));
            }

            function convertDatetimeLocalToISO(val) {
                const date = new Date(val);
                return isNaN(date.getTime()) ? null : toISOStringEST(date);
            }

            function saveRow(index) {
                const dateInput = document.getElementById('entryDate');
                const date = dateInput.value;
                const day       = new Date(date).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'long' });
                const month     = new Date(date).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'long' });
                const time      = new Date(date).toLocaleTimeString('en-US', { timeZone: 'America/New_York' });
                const timestamp = convertDatetimeLocalToISO(dateInput.value);
                const row = tbody.rows[index];
                const categorySelect = row.querySelector('.category-select');
                const updatedItem = {
                    id:       filteredData[index].id,
                    text:     row.cells[0].innerText,
                    category: categorySelect ? categorySelect.value : row.cells[1].textContent,
                    cost:     row.cells[2].innerText,
                    notes:    row.cells[3].innerText,
                    day, month, time, timestamp
                };
                fetch(`/data/${updatedItem.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedItem)
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        fetch('/data').then(r => r.json()).then(freshData => {
                            data = freshData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                            filteredData = data;
                            renderTable();
                            fetchDataAndRenderChart(getLocalDate());
                            toggleIcons(row, false);
                            row.classList.remove('editing-row');
                            Array.from(tbody.rows).forEach(r => r.classList.remove('blur'));
                            overlay.classList.add('d-none');
                            showAlert('success', 'Item updated successfully');
                        });
                    } else {
                        showAlert('danger', 'Failed to update item');
                    }
                })
                .catch(() => showAlert('danger', 'Failed to update item'));
            }

            function undoRow(index) {
                const row = tbody.rows[index];
                const categoryCell = row.cells[1];
                row.cells[0].innerText = filteredData[index].text;
                if (categoryCell.querySelector('.category-select')) categoryCell.textContent = filteredData[index].category;
                row.cells[2].innerText = filteredData[index].cost;
                row.cells[3].innerText = filteredData[index].notes;
                row.cells[4].innerText = filteredData[index].day;
                row.cells[5].innerText = filteredData[index].month;
                row.cells[6].innerText = filteredData[index].timestamp;
                for (let i = 0; i < row.cells.length - 1; i++) {
                    row.cells[i].contentEditable = 'false';
                    row.cells[i].addEventListener('click', filterHandler);
                }
                toggleIcons(row, false);
                row.classList.remove('editing-row');
                Array.from(tbody.rows).forEach(r => r.classList.remove('blur'));
                overlay.classList.add('d-none');
            }

            function toggleIcons(row, isEditing) {
                row.querySelector('.edit-icon').classList.toggle('d-none', isEditing);
                row.querySelector('.delete-icon').classList.toggle('d-none', isEditing);
                row.querySelector('.save-icon').classList.toggle('d-none', !isEditing);
                row.querySelector('.undo-icon').classList.toggle('d-none', !isEditing);
            }

            function confirmDelete(index) {
                $('#deleteModal').modal('show');
                document.getElementById('confirmDelete').onclick = () => {
                    deleteRow(index);
                    $('#deleteModal').modal('hide');
                };
            }

            let chartInstance = null;

            function fetchDataAndRenderChart(date) {
                fetch('/data')
                    .then(r => r.json())
                    .then(data => {
                        const todaysData = data
                            .filter(item => item.timestamp.startsWith(date))
                            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                        const timeValues = todaysData.map(item => item.time);
                        const categoryValues = todaysData.map(item => item.category || 'Uncategorized');
                        const uniqueCategories = [...new Set(categoryValues)];
                        const ctx = document.getElementById('myChart').getContext('2d');
                        if (chartInstance) chartInstance.destroy();
                        chartInstance = new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: timeValues,
                                datasets: [{
                                    label: 'Category',
                                    data: categoryValues.map(c => uniqueCategories.indexOf(c) + 1),
                                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                    borderColor: 'rgba(75, 192, 192, 1)',
                                    borderWidth: 1, fill: false,
                                    pointRadius: 5, pointHoverRadius: 7
                                }]
                            },
                            options: {
                                scales: {
                                    y: { ticks: { callback: v => uniqueCategories[v - 1] } }
                                },
                                plugins: {
                                    tooltip: {
                                        callbacks: {
                                            label: ctx => `Category: ${categoryValues[ctx.dataIndex]} — ${todaysData[ctx.dataIndex].text}`
                                        }
                                    }
                                }
                            }
                        });
                    });
            }

            function getLocalDate() {
                return new Date().toLocaleDateString('en-CA');
            }

            const chartDateInput = document.getElementById('chartDate');
            const today = getLocalDate();
            chartDateInput.value = today;
            chartDateInput.addEventListener('change', e => fetchDataAndRenderChart(e.target.value || getLocalDate()));
            fetchDataAndRenderChart(today);

            function deleteRow(index) {
                const id = filteredData[index].id;
                fetch(`/data/${id}`, { method: 'DELETE' })
                    .then(r => r.json())
                    .then(result => {
                        if (result.success) {
                            filteredData.splice(index, 1);
                            renderTable();
                            showAlert('success', 'Item deleted successfully');
                        } else {
                            showAlert('danger', 'Failed to delete item');
                        }
                    })
                    .catch(() => showAlert('danger', 'Failed to delete item'));
            }

            const filterData = (column, value) => {
                filteredData = data.filter(item => item[column] === value);
                renderTable();
                resetBtn.classList.remove('hidden');
                resetBtn.textContent = `Reset (Filtered by ${column}: ${value})`;
            };

            resetBtn.addEventListener('click', () => {
                filteredData = data;
                renderTable();
                resetBtn.classList.add('hidden');
                resetBtn.textContent = 'Reset Filter';
            });
        })
        .catch(err => {
            console.error('Error fetching data:', err);
        });
});

document.querySelectorAll('#dataTable th').forEach(header => {
    header.addEventListener('click', () => {
        const table = document.getElementById('dataTable');
        const tbody = table.getElementsByTagName('tbody')[0];
        const rows = Array.from(tbody.rows);
        const column = header.getAttribute('data-column');
        const order = header.getAttribute('data-order') === 'asc' ? 'desc' : 'asc';
        header.setAttribute('data-order', order);
        rows.sort((a, b) => {
            const aText = a.cells[header.cellIndex].textContent;
            const bText = b.cells[header.cellIndex].textContent;
            return order === 'asc'
                ? aText.localeCompare(bText, undefined, { numeric: true })
                : bText.localeCompare(aText, undefined, { numeric: true });
        });
        tbody.innerHTML = '';
        rows.forEach(row => tbody.appendChild(row));
    });
});

function showAlert(type, message) {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `${message}<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>`;
    alertContainer.appendChild(alert);
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 500);
    }, 1500);
}
