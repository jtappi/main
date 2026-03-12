document.addEventListener('DOMContentLoaded', () => {
    const BASE = '/trackmyweek';
    const categoryButtons = document.querySelectorAll('#categoryButtons .btn');
    const costInput = document.getElementById('costInput');
    const caloriesInput = document.getElementById('caloriesInput');
    const notesInput = document.getElementById('notesInput');
    const submitBtn = document.getElementById('submitBtn');

    function handleCategoryClick(button) {
        if (button.classList.contains('btn-primary')) {
            button.classList.replace('btn-primary', 'btn-secondary');
        } else {
            categoryButtons.forEach(btn => btn.classList.replace('btn-primary', 'btn-secondary'));
            button.classList.replace('btn-secondary', 'btn-primary');
        }
        handleCategorySelection(button.dataset.category);
        checkFormValidity();
    }

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => handleCategoryClick(button));
    });

    function handleCategorySelection(category) {
        costInput.disabled = false;
        notesInput.disabled = false;
        caloriesInput.disabled = category !== 'Food';
    }

    caloriesInput.addEventListener('input', () => {
        caloriesInput.value = caloriesInput.value.replace(/[^0-9]/g, '');
    });

    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const itemName = document.getElementById('itemName').value;
            const selected = document.querySelector('#categoryButtons .btn-primary');
            if (!selected) return;
            const cost     = document.getElementById('costInput')?.value     || null;
            const notes    = document.getElementById('notesInput')?.value    || null;
            const calories = document.getElementById('caloriesInput')?.value || null;
            submitItem(itemName, selected.dataset.category, cost, notes, calories);
        });
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const fetchSuggestions = debounce(() => {
        const query = document.getElementById('itemName').value;
        if (query.length >= 3) {
            fetch(`${BASE}/search?query=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    const suggestions = document.getElementById('suggestions');
                    suggestions.innerHTML = '';
                    const uniqueData = Array.from(new Map(data.map(item => [item.text, item])).values()).slice(0, 3);
                    if (uniqueData.length > 0) {
                        suggestions.classList.add('show');
                        uniqueData.forEach(item => {
                            const a = document.createElement('a');
                            a.classList.add('dropdown-item');
                            a.textContent = item.text;
                            a.addEventListener('click', () => {
                                document.getElementById('itemName').value = item.text;
                                suggestions.innerHTML = '';
                                suggestions.classList.remove('show');
                                if (item.category) {
                                    const cur = document.querySelector('#categoryButtons .btn-primary');
                                    if (cur) cur.classList.replace('btn-primary', 'btn-secondary');
                                    const btn = document.querySelector(`[data-category="${item.category}"]`);
                                    if (btn) {
                                        btn.classList.replace('btn-secondary', 'btn-primary');
                                        handleCategorySelection(item.category);
                                    }
                                }
                                if (item.cost)  document.getElementById('costInput').value  = item.cost;
                                if (item.notes) document.getElementById('notesInput').value = item.notes;
                                checkFormValidity();
                            });
                            suggestions.appendChild(a);
                        });
                    } else {
                        suggestions.classList.remove('show');
                    }
                })
                .catch(err => console.error('Suggestion fetch error:', err));
        } else {
            document.getElementById('suggestions').innerHTML = '';
            document.getElementById('suggestions').classList.remove('show');
        }
    }, 300);

    document.getElementById('itemName').addEventListener('input', fetchSuggestions);

    const alertContainer = document.getElementById('alertContainer');

    function showAlert(type, message) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `${message}<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>`;
        alertContainer.appendChild(alert);
        setTimeout(() => { alert.classList.remove('show'); setTimeout(() => alert.remove(), 500); }, 1500);
    }

    function submitItem(itemName, category, cost, notes, calories) {
        fetch(`${BASE}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: itemName, category, cost, notes, calories })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) showAlert('success', data.message);
            document.getElementById('itemName').value = '';
            document.getElementById('suggestions').innerHTML = '';
            document.getElementById('suggestions').classList.remove('show');
            fetchTopItems();
        })
        .catch(err => { showAlert('danger', 'An error occurred while submitting.'); console.error(err); });
    }

    async function fetchTopItems() {
        try {
            const response = await fetch(`${BASE}/top-items`);
            displayTopItems(await response.json());
        } catch (error) {
            console.error('Error fetching top items:', error);
        }
    }

    function displayTopItems(items) {
        const container = document.getElementById('topItems');
        if (!container) return;
        container.innerHTML = '';
        items.forEach(item => {
            const button = document.createElement('button');
            button.classList.add('btn', 'btn-outline-secondary', 'm-1');
            button.textContent = item.text;
            button.addEventListener('click', () => showEditNotesModal(item));
            container.appendChild(button);
        });
    }

    function showEditNotesModal(item) {
        const modal = $('#editNotesModal');
        const textarea = document.getElementById('editNotesText');
        textarea.value = item.notes || '';
        document.getElementById('saveNotesBtn').onclick = () => {
            submitItem(item.text, item.category, item.cost, textarea.value, item.calories);
            modal.modal('hide');
        };
        modal.modal('show');
    }

    fetchTopItems();

    document.getElementById('itemName').addEventListener('input', () => {
        const cb = document.getElementById('categoryButtons');
        cb.classList.toggle('hidden', document.getElementById('itemName').value.length === 0);
    });

    function checkFormValidity() {
        const text     = document.getElementById('itemName').value.trim();
        const category = document.querySelector('#categoryButtons .btn-primary');
        submitBtn.disabled = !text || !category;
    }

    document.getElementById('itemName').addEventListener('input', checkFormValidity);
    submitBtn.disabled = true;
});
