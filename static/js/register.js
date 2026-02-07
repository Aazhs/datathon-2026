const participation = document.getElementById('participation');
const teamSection = document.getElementById('teamSection');
const teamName = document.getElementById('team_name');
const teamSize = document.getElementById('team_size');
const teamMembers = document.getElementById('team_members');
const memberRows = Array.from(document.querySelectorAll('[data-member-row]'));
const memberInputs = Array.from({ length: 4 }, (_, index) => {
    const i = index + 1;
    return {
        row: document.querySelector(`[data-member-row="${i}"]`),
        name: document.getElementById(`member${i}_name`),
        email: document.getElementById(`member${i}_email`),
    };
});
const form = document.getElementById('registrationForm');
const formError = document.getElementById('formError');

const consentCheckbox = document.getElementById('consent');
const submitBtn = document.getElementById('submitBtn');

const mainName = document.getElementById('name');
const mainEmail = document.getElementById('email');

function isValidEmail(value) {
    const email = value.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function findFirstMissingRequiredField({ excludeIds = [] } = {}) {
    if (!form) return null;
    const exclude = new Set(excludeIds);

    const controls = Array.from(form.querySelectorAll('input, select, textarea'));
    for (const el of controls) {
        if (!el || el.disabled) continue;
        if (!el.hasAttribute('required')) continue;
        if (exclude.has(el.id)) continue;

        const type = (el.getAttribute('type') || '').toLowerCase();
        if (type === 'hidden' || type === 'submit' || type === 'button') continue;

        if (type === 'checkbox' || type === 'radio') {
            if (!el.checked) return el;
            continue;
        }

        const value = (el.value || '').trim();
        if (!value) return el;
    }

    return null;
}

function isFormCompleteForEnable() {
    // 1) All required fields filled
    const missing = findFirstMissingRequiredField();
    if (missing) return false;

    // 2) Basic validity checks that users expect before enabling
    const phoneEl = document.getElementById('phone');
    const emailEl = document.getElementById('email');

    if (emailEl && !isValidEmail(emailEl.value || '')) return false;

    if (phoneEl) {
        const digits = (phoneEl.value || '').replace(/\D/g, '');
        if (digits.length < 10) return false;
    }

    // 3) Team-specific checks
    const isTeam = participation?.value === 'team';
    if (isTeam) {
        const size = parseInt(teamSize?.value || '0', 10);
        if (![2, 3, 4].includes(size)) return false;
        if (!teamName?.value?.trim()) return false;

        autofillMember1IfEmpty();
        for (let i = 1; i <= size; i++) {
            const item = memberInputs[i - 1];
            const memberName = item?.name?.value?.trim() || '';
            const memberEmail = item?.email?.value?.trim() || '';
            if (!memberName) return false;
            if (!memberEmail || !isValidEmail(memberEmail)) return false;
        }
    }

    return true;
}

function syncSubmitButtonState() {
    if (!submitBtn) return;
    // Button is always enabled; validation happens on submit.
    submitBtn.disabled = false;
    submitBtn.setAttribute('aria-disabled', 'false');
}


function setMemberRowEnabled(memberIndex, enabled) {
    const item = memberInputs[memberIndex - 1];
    if (!item || !item.row) return;

    item.row.hidden = !enabled;
    [item.name, item.email].forEach((el) => {
        el.disabled = !enabled;
        if (!enabled) {
            el.value = '';
            el.removeAttribute('required');
        }
    });

    if (enabled) {
        item.name.setAttribute('required', 'required');
        item.email.setAttribute('required', 'required');
    }
}

function applyTeamSizeVisibility() {
    const size = parseInt(teamSize.value || '0', 10);
    for (let i = 1; i <= 4; i++) {
        setMemberRowEnabled(i, i <= size);
    }
}

function autofillMember1IfEmpty() {
    const m1 = memberInputs[0];
    if (!m1?.name || !m1?.email) return;

    if (!m1.name.value.trim() && mainName?.value?.trim()) {
        m1.name.value = mainName.value.trim();
    }
    if (!m1.email.value.trim() && mainEmail?.value?.trim()) {
        m1.email.value = mainEmail.value.trim();
    }
}

function serializeMembersToHiddenField() {
    const size = parseInt(teamSize.value || '0', 10);
    const members = [];
    for (let i = 1; i <= size; i++) {
        const item = memberInputs[i - 1];
        const name = item?.name?.value?.trim() || '';
        const email = item?.email?.value?.trim() || '';
        if (name || email) {
            members.push({ name, email });
        }
    }
    teamMembers.value = JSON.stringify(members);
}

function toggleTeamFields() {
    const isTeam = participation.value === 'team';

    if (teamSection) {
        teamSection.hidden = !isTeam;
    }

    [teamName, teamSize].forEach((el) => {
        el.disabled = !isTeam;
        if (!isTeam) {
            el.value = '';
        }
    });

    if (!isTeam) {
        // Hide and clear member rows when solo
        memberRows.forEach((row) => (row.hidden = true));
        memberInputs.forEach((item) => {
            if (!item) return;
            [item.name, item.email].forEach((el) => {
                el.disabled = true;
                el.value = '';
                el.removeAttribute('required');
            });
        });
        teamMembers.value = '';
    }

    if (isTeam) {
        teamName.setAttribute('required', 'required');
        teamSize.setAttribute('required', 'required');
    } else {
        teamName.removeAttribute('required');
        teamSize.removeAttribute('required');
    }

    applyTeamSizeVisibility();
}

participation.addEventListener('change', toggleTeamFields);
toggleTeamFields();
syncSubmitButtonState();

teamSize.addEventListener('change', () => {
    formError.textContent = '';
    applyTeamSizeVisibility();
    autofillMember1IfEmpty();
    syncSubmitButtonState();
});

[mainName, mainEmail].forEach((el) => {
    if (!el) return;
    el.addEventListener('blur', () => {
        autofillMember1IfEmpty();
        syncSubmitButtonState();
    });
});

// Keep submit button grey until all required fields are filled
if (form) {
    form.addEventListener('input', syncSubmitButtonState);
    form.addEventListener('change', syncSubmitButtonState);
}

form.addEventListener('submit', (event) => {
    formError.textContent = '';

    // Always provide valid JSON for team_members so the backend can store jsonb cleanly.
    // For solo, this becomes []
    if (teamMembers) {
        teamMembers.value = '[]';
    }

    // 1) First: required fields (except consent)
    const missing = findFirstMissingRequiredField({ excludeIds: ['consent'] });
    if (missing) {
        event.preventDefault();
        formError.textContent = 'Please fill all required fields.';
        if (typeof missing.reportValidity === 'function') {
            missing.reportValidity();
        }
        missing.focus();
        syncSubmitButtonState();
        return;
    }

    const phone = document.getElementById('phone').value.trim();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
        event.preventDefault();
        formError.textContent = 'Please enter a valid phone number (10 digits).';
        syncSubmitButtonState();
        return;
    }

    const isTeam = participation.value === 'team';
    if (isTeam) {
        if (!teamSize.value) {
            event.preventDefault();
            formError.textContent = 'Please select your team size.';
            syncSubmitButtonState();
            return;
        }
        if (!teamName.value.trim()) {
            event.preventDefault();
            formError.textContent = 'Please enter a team name.';
            syncSubmitButtonState();
            return;
        }

        autofillMember1IfEmpty();
        const size = parseInt(teamSize.value || '0', 10);
        for (let i = 1; i <= size; i++) {
            const item = memberInputs[i - 1];
            const memberName = item?.name?.value?.trim() || '';
            const memberEmail = item?.email?.value?.trim() || '';
            if (!memberName) {
                event.preventDefault();
                formError.textContent = `Please enter Member ${i} name.`;
                syncSubmitButtonState();
                return;
            }
            if (!memberEmail || !isValidEmail(memberEmail)) {
                event.preventDefault();
                formError.textContent = `Please enter a valid email for Member ${i}.`;
                syncSubmitButtonState();
                return;
            }
        }

        serializeMembersToHiddenField();
    }

    // Consent is optional
});
