def fix_admin_check(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # The bug: data.usuario doesn't exist, we must use the global `currentUser`
    old_check = """        const data = window.appData;
        let isAdmin = false;
        if (data && data.insignias && data.usuario) {
            let myBadges = data.insignias[data.usuario] || [];
            myBadges.forEach(b => { if(b.type === 'admin' || b.text.toLowerCase().includes('admin')) isAdmin = true; });
        }"""
        
    new_check = """        const data = window.appData;
        let isAdmin = false;
        let loggedUser = (data && data.usuario) ? data.usuario : (typeof currentUser !== 'undefined' ? currentUser : '');
        if (data && data.insignias && loggedUser) {
            let myBadges = data.insignias[loggedUser] || [];
            myBadges.forEach(b => { if(b.type === 'admin' || b.text.toLowerCase().includes('admin')) isAdmin = true; });
        }"""

    if old_check in text:
        text = text.replace(old_check, new_check)
    else:
        print("Could not find old check")
        
    # Also fix openPlayerInfo where it uses data.usuario
    old_openInfo = """let myIndex = ranking.findIndex(r => r.jugador === (data.usuario || currentUser));"""
    # This one is already correct because it falls back to `currentUser`
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Fixed admin check!")

fix_admin_check('dev.html')
