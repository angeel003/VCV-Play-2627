
if(document.getElementById('btnAdminClearCache')){
    document.getElementById('btnAdminClearCache').addEventListener('click', function(e) {
        e.preventDefault();
        let btn = this;
        let oldHTML = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Recalculando...';
        btn.disabled = true;
        fetchSeguro(scriptURL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'clear_cache', usuario: currentUser, password: currentPassword }), 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            btn.innerHTML = oldHTML;
            btn.disabled = false;
        }).catch(err => {
            alert("Error: " + err);
            btn.innerHTML = oldHTML;
            btn.disabled = false;
        });
    });
}
