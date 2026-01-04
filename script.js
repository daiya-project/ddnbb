// 이름 열 배경색용 다양한 파스텔 색상 목록 (전체 테마와 조화롭게)
const PASTEL_COLORS = [
    '#b8d4f0', // 파란색
    '#ffd1dc', // 핑크
    '#e2f0cb', // 연두색
    '#ffeaa7', // 노란색
    '#d1def0', // 하늘색
    '#f0c9ff', // 라벤더
    '#ffcccb', // 연한 빨강
    '#b5ead7', // 민트
    '#c7ceea', // 라벤더 블루
    '#ffb3ba', // 피치
    '#bae1ff', // 스카이 블루
    '#ffdfba', // 복숭아
    '#ffffba', // 레몬
    '#c4e0ff', // 베이비 블루
    '#ffcccc', // 로즈
    '#d4a5ff'  // 라일락
];

let state = {
    rounds: [],
    people: [],
    payers: {}, 
    exclusions: {}
};

let currentMode = null;

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    // 데이터가 없으면 기본 3차까지 생성
    if (state.rounds.length === 0) {
        for(let i=0; i<3; i++) addNewRound(false); // false: don't save yet to avoid multiple renders
        saveData(); // 한 번에 저장
    }
    
    // 초기 렌더링
    renderRounds();
    renderMatrix();
    renderResult();
    
    // 스크롤 이벤트 리스너 추가 - 섹션 진입 시 결제한 사람 버튼 활성화
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.addEventListener('scroll', handleScroll);
    }
    
    // 초기 로드 시 현재 보이는 섹션 확인
    setTimeout(checkCurrentSection, 100);
});

// === 스크롤 이벤트 핸들러 ===
function handleScroll() {
    checkCurrentSection();
}

// === 현재 보이는 섹션 확인 ===
function checkCurrentSection() {
    const sections = ['section-input', 'section-matrix', 'section-result'];
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) return;
    
    const containerTop = appContainer.scrollTop;
    const containerHeight = appContainer.clientHeight;
    
    for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (!section) continue;
        
        const sectionTop = section.offsetTop - appContainer.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        // 섹션이 화면에 보이는지 확인 (50% 이상 보이면 활성화)
        if (containerTop >= sectionTop - containerHeight * 0.3 && 
            containerTop < sectionTop + sectionHeight - containerHeight * 0.7) {
            
            if (sectionId === 'section-matrix') {
                // 매트릭스 페이지 진입 시 결제한 사람 버튼 자동 활성화
                if (currentMode !== 'pay') {
                    setMode('pay');
                }
            }
            break;
        }
    }
}

function loadData() {
    const saved = localStorage.getItem('nBangMasterData');
    if (saved) state = JSON.parse(saved);
}

function saveData() {
    localStorage.setItem('nBangMasterData', JSON.stringify(state));
    renderMatrix();
    renderResult();
}

function resetAllData() {
    state = { rounds: [], people: [], payers: {}, exclusions: {} };
    localStorage.removeItem('nBangMasterData');
    
    // 활성화된 버튼 비활성화
    currentMode = null;
    updateModeUI();
    
    // 데이터 초기화 후 기본 3차 생성
    for(let i=0; i<3; i++) addNewRound(false);
    saveData();
    
    // 렌더링 업데이트
    renderRounds();
    renderMatrix();
    renderResult();
    
    // 최상단으로 부드럽고 빠르게 스크롤 (렌더링 후 실행)
    setTimeout(() => {
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, 100);
}

// === 결제자 선택 검증 ===
function validatePayers() {
    const activeRounds = state.rounds.filter(r => r.amount > 0);
    for (const round of activeRounds) {
        if (!state.payers[round.id]) {
            return false;
        }
    }
    return true;
}

// === 스크롤 네비게이션 ===
function goToSection(sectionId) {
    // 정산 결과 페이지로 이동 시 결제자 선택 검증
    if (sectionId === 'section-result') {
        if (!validatePayers()) {
            alert('계산한 사람 선택');
            return;
        }
    }
    
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        if (sectionId === 'section-matrix') {
            renderMatrix();
            // 매트릭스 페이지 진입 시 결제한 사람 버튼 자동 활성화
            setMode('pay');
        }
        if (sectionId === 'section-result') renderResult();
    }
}

// === 유틸리티: 숫자 포맷 (콤마) ===
function formatNumber(num) {
    if (!num) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function unformatNumber(str) {
    if (!str) return 0;
    return parseInt(str.toString().replace(/,/g, '')) || 0;
}

// HTML 이스케이프 함수 (XSS 방지)
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// === 1. 계산 내역 관리 ===

function addNewRound(shouldSave = true) {
    const id = Date.now() + Math.random(); // 빠른 생성 시 중복 방지
    const idx = state.rounds.length + 1;
    // name은 비워두고, 렌더링 시 placeholder로 처리
    state.rounds.push({ id: id, name: "", amount: 0 });
    state.payers[id] = null;
    state.exclusions[id] = [];
    
    if (shouldSave) {
        renderRounds();
        saveData();
    }
}

// 입력 필드 변경 핸들러
function updateRound(id, field, value) {
    // ID를 숫자로 변환 (문자열로 전달될 수 있음)
    const idNum = typeof id === 'string' ? parseFloat(id) : id;
    const round = state.rounds.find(r => r.id === idNum);
    if (round) {
        if (field === 'amount') {
            // 콤마 제거 후 숫자 저장
            round[field] = unformatNumber(value);
        } else {
            round[field] = value;
        }
        saveData();
    }
}

function removeRound(id) {
    // ID를 숫자로 변환 (문자열로 전달될 수 있음)
    const idNum = typeof id === 'string' ? parseFloat(id) : id;
    if (state.rounds.length <= 1) return alert("최소 1개의 항목은 필요합니다.");
    
    // 팝업 없이 즉시 삭제
    state.rounds = state.rounds.filter(r => r.id !== idNum);
    delete state.payers[idNum];
    delete state.exclusions[idNum];
    renderRounds();
    saveData();
}

function renderRounds() {
    const container = document.getElementById('round-list');
    
    // 현재 입력 중인 값들을 먼저 저장
    state.rounds.forEach(round => {
        const nameInput = document.getElementById(`round-name-${round.id}`);
        const amountInput = document.getElementById(`round-amount-${round.id}`);
        if (nameInput) {
            round.name = nameInput.value;
        }
        if (amountInput) {
            round.amount = unformatNumber(amountInput.value);
        }
    });
    
    container.innerHTML = '';
    
    state.rounds.forEach((round, index) => {
        const roundNum = index + 1;
        const div = document.createElement('div');
        div.className = 'round-item';
        
        // 콤마가 포함된 표시용 금액
        const displayAmount = round.amount > 0 ? formatNumber(round.amount) : '';
        
        const escapedName = escapeHtml(round.name);
        const roundIdStr = String(round.id);
        div.innerHTML = `
            <span class="round-idx">${roundNum}</span>
            <input type="text" 
                   id="round-name-${roundIdStr}"
                   value="${escapedName}" 
                   placeholder="${roundNum}차" 
                   oninput="updateRound(${roundIdStr}, 'name', this.value)">
            <input type="tel" 
                   id="round-amount-${roundIdStr}"
                   value="${displayAmount}" 
                   placeholder="0" 
                   inputmode="numeric" 
                   oninput="this.value = formatNumber(unformatNumber(this.value)); updateRound(${roundIdStr}, 'amount', this.value);">
            ${state.rounds.length > 1 ? `<button class="btn-del-round" onclick="removeRound(${roundIdStr})"><i class="fa-solid fa-minus"></i></button>` : ''}
        `;
        container.appendChild(div);
    });
}

// === 2. 참석자 & 매트릭스 ===

function handleEnter(e) {
    if (e.key === 'Enter') addPerson();
}

function addPerson() {
    const input = document.getElementById('new-person-name');
    const name = input.value.trim();
    if (!name) return alert('이름을 입력해주세요.');
    if (state.people.some(p => p.name === name)) return alert('이미 있는 이름입니다.');

    const color = PASTEL_COLORS[state.people.length % PASTEL_COLORS.length];
    
    state.people.push({ id: Date.now(), name: name, color: color });
    input.value = '';
    input.focus();
    saveData();
}

function setMode(mode) {
    if (currentMode === mode) {
        currentMode = null;
    } else {
        currentMode = mode;
    }
    updateModeUI();
}

function updateModeUI() {
    document.querySelectorAll('.btn-mode').forEach(btn => btn.classList.remove('active'));
    const desc = document.getElementById('mode-desc');
    
    if (currentMode === 'pay') {
        document.getElementById('btn-mode-pay').classList.add('active');
        desc.innerHTML = "<span style='color:#d35400'>누가 결제했나요? 표에서 선택해주세요.</span>";
    } else if (currentMode === 'exclude') {
        document.getElementById('btn-mode-exclude').classList.add('active');
        desc.innerHTML = "<span style='color:#c0392b'>누가 빠졌나요? 표에서 선택해주세요.</span>";
    } else {
        desc.innerText = "위 버튼을 누르고 표의 칸을 클릭하세요";
    }
}

function handleCellClick(roundId, personId, personColor, event) {
    // ID를 숫자로 변환 (문자열로 전달될 수 있음)
    const roundIdNum = typeof roundId === 'string' ? parseFloat(roundId) : roundId;
    const personIdNum = typeof personId === 'string' ? parseFloat(personId) : personId;
    
    // 클릭한 셀 요소 가져오기
    const clickedCell = event ? event.target.closest('td') : null;
    
    if (!currentMode) {
        alert("먼저 '결제한 사람' 또는 '제외할 사람' 버튼을 눌러주세요.");
        return;
    }

    if (currentMode === 'pay') {
        if (state.payers[roundIdNum] === personIdNum) {
            // 결제자 해제
            state.payers[roundIdNum] = null;
        } else {
            // 결제자 설정
            state.payers[roundIdNum] = personIdNum;
        }
        
        // 결제한 사람 선택 후 행열 클릭 시 해당 참석자의 배경색 적용
        // 이름 행에 적용된 배경색(personColor)을 행열에 적용
        if (clickedCell && personColor) {
            const hex = personColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            // 왕관 등의 현재 스타일은 유지하고 배경색만 변경
            clickedCell.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
            // data 속성에 색상 저장 (다시 렌더링 시 유지)
            clickedCell.setAttribute('data-person-color', personColor);
        }
    } else if (currentMode === 'exclude') {
        if (!state.exclusions[roundIdNum]) state.exclusions[roundIdNum] = [];
        const idx = state.exclusions[roundIdNum].indexOf(personIdNum);
        if (idx > -1) state.exclusions[roundIdNum].splice(idx, 1);
        else state.exclusions[roundIdNum].push(personIdNum);
    }
    
    saveData();
    // 상태 변경 후 매트릭스 다시 렌더링
    renderMatrix();
}

function renderMatrix() {
    const thead = document.getElementById('matrix-head');
    const tbody = document.getElementById('matrix-body');
    
    // 유효한 차수(금액 > 0)만 필터링
    const activeRounds = state.rounds.filter(r => r.amount > 0);
    
    // 헤더 생성
    let headHtml = `<tr><th style="min-width:90px;">이름</th>`;
    activeRounds.forEach((r, idx) => {
        // 이름이 없으면 N차로 표시 (데이터 구조상 index 찾아서 표시해야 함)
        let displayName = r.name;
        if (!displayName) {
            // 전체 리스트에서 인덱스 찾기
            const realIdx = state.rounds.findIndex(origin => origin.id === r.id);
            displayName = `${realIdx + 1}차`;
        }

        headHtml += `
            <th style="min-width:100px;">
                <div style="font-size:0.95em;">${escapeHtml(displayName)}</div>
                <div style="font-size:0.8em; color:#999; margin-top:2px;">${formatNumber(r.amount)}</div>
            </th>`;
    });
    headHtml += `</tr>`;
    thead.innerHTML = headHtml;

    // 바디 생성
    tbody.innerHTML = '';
    
    if (state.people.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${activeRounds.length + 1}" style="padding:30px; color:#aaa;">아직 참석자가 없습니다.<br>위에서 이름을 추가해주세요.</td></tr>`;
        return;
    }

    state.people.forEach(person => {
        const tr = document.createElement('tr');
        
        const escapedPersonName = escapeHtml(person.name);
        const personIdStr = String(person.id);
        const personColorEscaped = escapeHtml(person.color);
        // 이름 열에 파스텔톤 배경색 적용
        let nameHtml = `<th class="name-cell" style="background-color:${personColorEscaped};">
            <span style="background:${personColorEscaped}; padding: 4px 10px; border-radius:12px;">${escapedPersonName}</span>
        </th>`;
        
        let cellsHtml = '';
        activeRounds.forEach(round => {
            const isPayer = state.payers[round.id] === person.id;
            const isExcluded = (state.exclusions[round.id] || []).includes(person.id);
            
            // 1/n 계산
            const participantsCount = state.people.length - (state.exclusions[round.id] || []).length;
            let splitAmount = 0;
            let displayAmount = '-';

            if (!isExcluded && participantsCount > 0) {
                splitAmount = Math.ceil(round.amount / participantsCount);
                displayAmount = formatNumber(splitAmount);
            }

            let classes = ['cell-clickable'];
            if (isPayer) classes.push('payer');
            if (isExcluded) classes.push('excluded');

            const roundIdStr = String(round.id);
            const personColorEscaped = escapeHtml(person.color);
            // 결제자인 경우 배경색 적용
            let cellStyle = '';
            if (isPayer) {
                const hex = person.color.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                cellStyle = `style="background-color: rgba(${r}, ${g}, ${b}, 0.2);"`;
            }
            cellsHtml += `
                <td class="${escapeHtml(classes.join(' '))}" ${cellStyle} data-person-color="${personColorEscaped}" onclick="handleCellClick(${roundIdStr}, ${personIdStr}, '${personColorEscaped}', event)">
                    ${escapeHtml(displayAmount)}
                </td>
            `;
        });

        tr.innerHTML = nameHtml + cellsHtml;
        tbody.appendChild(tr);
    });
}

// === 3. 결과 계산 ===

function renderResult() {
    const container = document.getElementById('settlement-list');
    container.innerHTML = '';

    let balances = {};
    state.people.forEach(p => balances[p.id] = 0);

    // 금액이 있는 라운드만 계산
    const activeRounds = state.rounds.filter(r => r.amount > 0);

    activeRounds.forEach(round => {
        const payerId = state.payers[round.id];
        const excludedList = state.exclusions[round.id] || [];
        const participants = state.people.filter(p => !excludedList.includes(p.id));
        const count = participants.length;

        if (count > 0 && round.amount > 0) {
            const splitAmount = Math.ceil(round.amount / count);

            participants.forEach(p => {
                balances[p.id] -= splitAmount;
            });

            if (payerId) {
                balances[payerId] += round.amount;
            }
        }
    });

    let hasResult = false;
    state.people.forEach(person => {
        const balance = balances[person.id];
        if (balance === 0) return;
        hasResult = true;

        const div = document.createElement('div');
        div.className = 'result-item';
        
        let amountHtml = '';
        if (balance > 0) {
            amountHtml = `<span class="result-amount money-plus">+${formatNumber(balance)}</span>`;
        } else {
            amountHtml = `<span class="result-amount money-minus">${formatNumber(balance)}</span>`;
        }
        
        const escapedPersonName = escapeHtml(person.name);
        const escapedColor = escapeHtml(person.color);
        div.innerHTML = `
            <div class="result-name">
                <span class="color-dot" style="background:${escapedColor}"></span> ${escapedPersonName}
            </div>
            ${amountHtml}
        `;
        container.appendChild(div);
    });

    if (!hasResult && state.people.length > 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#aaa;">정산할 금액이 딱 떨어지거나, 계산할 내역이 없습니다.</div>';
    } else if (state.people.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#aaa;">참석자를 등록해주세요.</div>';
    }
}

// === 4. 정산표 클립보드 복사 ===
function copySettlementToClipboard() {
    // 결제자 선택 검증
    if (!validatePayers()) {
        alert('계산한 사람 선택');
        // 스텝2로 스크롤
        goToSection('section-matrix');
        return;
    }
    
    // 결제자가 모두 선택되었을 때 확인 팝업
    if (confirm('정산표를 복사하고 초기화하시겠습니까?')) {
        // 정산표 복사 및 초기화 진행
        performSettlementAndReset();
        // 최상단으로 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        // 취소 시 스텝2로 스크롤
        goToSection('section-matrix');
    }
}

// === 정산표 복사 및 초기화 ===
function performSettlementAndReset() {
    let balances = {};
    state.people.forEach(p => balances[p.id] = 0);

    // 금액이 있는 라운드만 계산
    const activeRounds = state.rounds.filter(r => r.amount > 0);

    activeRounds.forEach(round => {
        const payerId = state.payers[round.id];
        const excludedList = state.exclusions[round.id] || [];
        const participants = state.people.filter(p => !excludedList.includes(p.id));
        const count = participants.length;

        if (count > 0 && round.amount > 0) {
            const splitAmount = Math.ceil(round.amount / count);

            participants.forEach(p => {
                balances[p.id] -= splitAmount;
            });

            if (payerId) {
                balances[payerId] += round.amount;
            }
        }
    });

    // 정산표 텍스트 생성
    let settlementText = '📊 정산표\n\n';
    
    // 지출 내역
    if (activeRounds.length > 0) {
        settlementText += '💰 지출 내역 \n';
        activeRounds.forEach((round, index) => {
            const roundNum = index + 1;
            const displayName = round.name || `${roundNum}차`;
            const payer = state.people.find(p => p.id === state.payers[round.id]);
            const payerName = payer ? payer.name : '미지정';
            // 결제자 이름을 괄호 안에 숫자나 이름으로 표시
            let payerDisplay = payerName;
            if (payer) {
                const payerIndex = state.people.findIndex(p => p.id === payer.id) + 1;
                payerDisplay = payerIndex.toString();
            } else {
                payerDisplay = '지정';
            }
            settlementText += `${displayName}: ${formatNumber(round.amount)}원 (${payerDisplay})\n`;
        });
        settlementText += '\n';
    }
    
    // 정산 결과
    settlementText += '💸 정산 결과\n';
    let hasResult = false;
    state.people.forEach((person, index) => {
        const balance = balances[person.id];
        if (balance === 0) return;
        hasResult = true;
        const sign = balance > 0 ? '+' : '';
        settlementText += `${index + 1}: ${sign}${formatNumber(balance)}원\n`;
    });
    
    if (!hasResult) {
        settlementText += '정산할 금액이 없습니다.\n';
    }
    
    // URL 추가
    settlementText += '\n띠띠n빵빵 : https://ddnbb.netlify.app/ \n';

    // 클립보드에 복사
    navigator.clipboard.writeText(settlementText).then(() => {
        // 초기화 및 스텝1로 스크롤 (팝업 없이)
        resetAllData();
    }).catch(err => {
        // 클립보드 API가 지원되지 않는 경우 대체 방법
        const textArea = document.createElement('textarea');
        textArea.value = settlementText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            // 초기화 및 스텝1로 스크롤 (팝업 없이)
            resetAllData();
        } catch (err) {
            alert('클립보드 복사에 실패했습니다. 정산표를 직접 복사해주세요.\n\n' + settlementText);
        }
        document.body.removeChild(textArea);
    });
}