document.addEventListener('DOMContentLoaded', () => {
    const 검색버튼 = document.getElementById('searchButton');
    const 검색입력 = document.getElementById('searchInput');
    const 단어상세정보 = document.getElementById('wordDetails');
    const 요약결과 = document.getElementById('summaryResults');
    const 문제결과 = document.getElementById('results');
    const 최근검색어 = document.getElementById('recentSearches');
    const 최근검색어버튼 = document.getElementById('recentSearchButton');
    const 단어자동완성 = document.getElementById('autocompleteResults');
    const 테마토글버튼 = document.getElementById('themeToggleButton');
    const UNSPLASH_KEY = 'c6fLotA-bRLbvx-xrNBgB6WRPYl8gfthXPl3Z8tEugk';
    
    const 최근검색들 = JSON.parse(localStorage.getItem('최근검색어')) || [];

    function 최근검색어보여주기() {
        if (최근검색어) {
            최근검색어.querySelector('.recent-searches-container').innerHTML = `
                ${최근검색들.map((term, index) => `
                    <div class="recent-search-card">
                        <a href="#" class="recent-search">${term}</a>
                        <button class="delete-button" data-index="${index}">&times;</button>
                    </div>
                `).join('')}
            `;
            document.querySelectorAll('.recent-search').forEach(link => {
                link.addEventListener('click', (e) => {
                    검색입력.value = e.target.textContent;
                    검색버튼.click();
                });
            });
            document.querySelectorAll('.delete-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    최근검색들.splice(index, 1);
                    localStorage.setItem('최근검색어', JSON.stringify(최근검색들));
                    최근검색어보여주기();
                });
            });
        }
    }

    function 최근검색어토글() {
        if (최근검색어.style.display === 'block') {
            최근검색어.style.display = 'none';
        } else {
            최근검색어.style.display = 'block';
            최근검색어보여주기();
        }
    }

    최근검색어버튼.addEventListener('click', 최근검색어토글);

    document.addEventListener('click', (e) => {
        if (!검색입력.contains(e.target) && !단어자동완성.contains(e.target) && !최근검색어.contains(e.target) && e.target !== 최근검색어버튼) {
            단어자동완성.style.display = 'none';
            최근검색어.style.display = 'none';
        }
    });

    검색버튼.addEventListener('click', () => {
        const 검색어 = 검색입력.value.trim().toLowerCase();
        if (검색어 === '') {
            alert('검색어를 입력하세요.');
            return;
        }

        if (!최근검색들.includes(검색어)) {
            최근검색들.unshift(검색어);
            if (최근검색들.length > 5) 최근검색들.pop();
            localStorage.setItem('최근검색어', JSON.stringify(최근검색들));
            최근검색어보여주기();
        }

        단어상세정보.innerHTML = '';
        요약결과.innerHTML = '';
        문제결과.innerHTML = '';

        Promise.all([
            단어정보가져오기(검색어),
            문제찾기(검색어),
            이미지찾기(검색어)
        ])
        .then(([상세정보, 문제들, 이미지URL]) => {
            단어상세정보보여주기(상세정보, 검색어, 이미지URL);
            요약결과보여주기(문제들, 검색어);
        })
        .catch(오류 => console.error('오류 발생:', 오류));
    });

    검색입력.addEventListener('input', () => {
        const query = 검색입력.value.trim();
        if (query.length < 2) {
            단어자동완성.innerHTML = '';
            단어자동완성.style.display = 'none';
            return;
        }
        추천검색어가져오기(query);
    });

    function 추천검색어가져오기(query) {
        const apiUrl = `https://api.datamuse.com/words?sp=${query}*`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                단어자동완성보여주기(data);
            })
            .catch(error => console.error('Error:', error));
    }

    function 단어자동완성보여주기(results) {
        if (results.length === 0) {
            단어자동완성.innerHTML = '<p>No suggestions found.</p>';
            단어자동완성.style.display = 'block';
            return;
        }

        단어자동완성.innerHTML = results
            .slice(0, 5)
            .map(result => `<div class="autocomplete-result-item">${result.word}</div>`)
            .join('');

        단어자동완성.style.display = 'block';

        document.querySelectorAll('.autocomplete-result-item').forEach(item => {
            item.addEventListener('click', () => {
                검색입력.value = item.textContent;
                단어자동완성.innerHTML = '';
                단어자동완성.style.display = 'none';
                검색버튼.click();
            });
        });
    }

    function 단어정보가져오기(단어) {
        const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${단어}`;
        return fetch(apiUrl)
            .then(response => response.json())
            .then(data => ({
                정의: data[0].meanings[0].definitions[0].definition || '없음',
                예문: data[0].meanings[0].definitions[0].example || '없음',
                비슷한단어: data[0].meanings[0].definitions[0].synonyms || '없음'
            }));
    }

    function 문제찾기(검색어) {
        return fetch('list.json')
            .then(response => response.json())
            .then(data => 문제필터(data, 검색어));
    }

    function 문제필터(데이터, 검색어) {
        let 결과 = [];
        for (const 학년 in 데이터) {
            for (const 연도 in 데이터[학년]) {
                데이터[학년][연도].forEach(시험 => {
                    시험['문제들'].forEach(문제 => {
                        const 문제내용 = `${문제['문제 내용']} ${Object.values(문제['문제 선지']).join(' ')}`;
                        if (문제내용.toLowerCase().includes(검색어)) {
                            결과.push({
                                학년,
                                연도,
                                날짜: 시험['시행날짜'] || '정보 없음',
                                제목: 문제['문제 제목'] || '정보 없음',
                                내용: 문제['문제 내용'] || '정보 없음',
                                선택지: 문제['문제 선지'] || '정보 없음',
                                정답: 문제['문항 정답'] || '정보 없음',
                                해설: 문제['해설'] || '정보 없음',
                                문항번호: 문제['문항 번호'] || '정보 없음',
                                배점: 문제['배점'] || '2점',
                                오답률: 문제['오답률'] || '정보 없음',
                                출제의도: 문제['출제의도'] || '정보 없음'
                            });
                        }
                    });
                });
            }
        }
        return 결과;
    }

    function 단어상세정보보여주기(상세정보, 검색어, 이미지URL) {
        const { 정의, 예문, 비슷한단어 } = 상세정보;

        단어상세정보.innerHTML = `
            <h2>${검색어}</h2>
            <p><strong>정의:</strong> ${정의}</p>
            <p><strong>예문:</strong> ${예문}</p>
            <p><strong>비슷한 단어:</strong> ${비슷한단어.join(', ')}</p>
            ${이미지URL ? `<img src="${이미지URL}" alt="${검색어}">` : ''}
        `;
    }

function 요약결과보여주기(문제들, 검색어) {
        if (문제들.length === 0) {
            요약결과.innerHTML = `
                <h2>해당 단어가 있는 모의고사 / 수능 문제</h2>
                <p>검색 결과가 없습니다.</p>
            `;
            return;
        }

        const 최대결과수 = 5;
        const 표시문제들 = 문제들.slice(0, 최대결과수);

        요약결과.innerHTML = `
            <h2>해당 단어가 있는 모의고사 / 수능 문제</h2>
            ${표시문제들.map(문제 => `
                <div class="요약-항목">
                    <p data-problem='${JSON.stringify(문제)}'>
                        ${문제.연도}년 ${문제.학년} ${문제.날짜} ${문제.문항번호}번 문제 내용: ${강조하기(문제.내용, 검색어).substring(0, 50)}...
                    </p>
                </div>
            `).join('')}
            ${문제들.length > 최대결과수 ? '<p>총 ' + 문제들.length + '개의 결과가 있습니다.</p>' : ''}
        `;

        document.querySelectorAll('.요약-항목 p').forEach(p => {
            p.addEventListener('click', () => {
                const 문제 = JSON.parse(p.getAttribute('data-problem'));
                상세문제보여주기(문제, 검색어);
            });
        });
    }

    function 강조하기(텍스트, 검색어) {
        if (!검색어) return 텍스트;
        if (typeof 텍스트 !== 'string') return String(텍스트);
        const 정규식 = new RegExp(`(${검색어})`, 'gi');
        return 텍스트.replace(정규식, '<mark>$1</mark>');
    }

    function 상세문제보여주기(문제, 검색어) {
        문제결과.innerHTML = `
            <div class="결과-항목">
                <div class="헤더">
                    <p>${문제.연도}년 ${문제.학년} ${문제.날짜}</p>
                </div>
                <div class="문제">
                    <p class="문제-제목">${문제.문항번호}번, ${문제.제목}  |  배점: ${문제.배점}  |  오답률: ${문제.오답률}</p>
                    <p class="문제-내용">${강조하기(문제.내용, 검색어)}</p>
                </div>
                <div class="문제-선지">
                    <strong>문제 선지:</strong>
                    ${Object.entries(문제.선택지).map(([key, value]) => `<p class="선지">${key}: ${강조하기(value, 검색어)}</p>`).join('')}
                </div>
                <button class="토글-버튼">정답 및 해설 보기</button>
                <div class="토글-텍스트" style="display: none;">
                    <p><strong>정답:</strong> ${문제.정답}</p>
                    <p><strong>출제의도:</strong> ${문제.출제의도}</p>
                    <p><strong>해설:</strong> ${문제.해설}</p>
                </div>
                <button id="이미지다운로드버튼" class="아이콘-버튼">이미지로 저장</button>
            </div>
        `;
        토글버튼추가();

        document.getElementById('이미지다운로드버튼').addEventListener('click', () => {
            이미지로저장하기(문제, 검색어);
        });
    }

    function 토글버튼추가() {
        document.querySelectorAll('.토글-버튼').forEach(button => {
            button.addEventListener('click', () => {
                const 토글텍스트 = button.nextElementSibling;
                if (토글텍스트.style.display === 'none') {
                    토글텍스트.style.display = 'block';
                    button.textContent = '정답 및 해설 숨기기';
                } else {
                    토글텍스트.style.display = 'none';
                    button.textContent = '정답 및 해설 보기';
                }
            });
        });
    }

    function 이미지요청하기(단어) {
        const apiUrl = `https://api.unsplash.com/search/photos?query=${단어}&client_id=${UNSPLASH_KEY}`;
        return fetch(apiUrl)
            .then(response => response.json())
            .then(data => data.results.length > 0 ? data.results[0].urls.small : null);
    }

    테마토글버튼.addEventListener('click', () => {
        document.body.classList.toggle('다크모드');
        const isDarkMode = document.body.classList.contains('다크모드');
        const icon = isDarkMode ? 'fas fa-moon' : 'fas fa-sun';
        테마토글버튼.querySelector('i').className = icon;
    });

    function 이미지로저장하기(문제, 검색어) {
        
        function 숨겨진요소보이기() {
            const elements = document.querySelectorAll('.토글-텍스트');
            elements.forEach(el => el.style.display = 'block');
        }
    
        function 요소숨기기() {
            const elements = document.querySelectorAll('.토글-텍스트');
            elements.forEach(el => el.style.display = 'none');
        }
    
        const 임시Div = document.createElement('div');
        임시Div.style.position = 'relative';
        임시Div.style.width = '1080px';
        임시Div.style.height = '1350px';
        임시Div.style.fontFamily = 'Arial, sans-serif';
        임시Div.style.backgroundColor = '#f9f9f9';
        임시Div.style.borderRadius = '15px';
        임시Div.style.padding = '20px';
        임시Div.style.boxSizing = 'border-box';
        임시Div.style.zIndex = '9999';
        임시Div.style.overflow = 'hidden';
        document.body.appendChild(임시Div);
    
        임시Div.innerHTML = `
        <style>
        .결과-항목 {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            border-radius: 15px;
            background-color: #ffffff;
            position: relative;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            box-sizing: border-box;
        }
        .헤더 {
            text-align: center;
            margin-bottom: 20px;
        }
        .헤더 p {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin: 0;
        }
        .문제 {
            margin-bottom: 20px;
            padding: 20px;
            border-radius: 12px;
            background-color: #f0f0f0;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        .문제-제목 {
            font-size: 22px;
            font-weight: bold;
            color: #333;
            margin: 0;
            text-align: center;
        }
        .문제-내용 {
            font-size: 18px;
            color: #666;
            text-align: left;
            margin: 10px 0;
        }
        .문제-선지 {
            margin-bottom: 20px;
            padding: 20px;
            border-radius: 12px;
            background-color: #f0f0f0;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        .문제-선지 strong {
            font-size: 18px;
            color: #444;
            display: block;
            margin-bottom: 10px;
        }
        .선지 {
            font-size: 18px;
            color: #555;
            margin-bottom: 8px;
        }
        .토글-텍스트 {
            padding: 20px;
            border-radius: 12px;
            background-color: #f9f9f9;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
        }
        .토글-텍스트 p {
            font-size: 18px;
            color: #444;
            margin: 5px 0;
        }
        .워터마크 {
            position: absolute;
            bottom: 30px;
            right: 20px;
            font-size: 40px;
            color: rgba(0, 0, 0, 0.1);
            font-weight: bold;
            pointer-events: none;
        }
        </style>
<div class="결과-항목">
            <div class="헤더">
                <p>${문제.연도}년 ${문제.학년} ${문제.날짜}</p>
            </div>
            <div class="문제">
                <p class="문제-제목">${문제.문항번호}번, ${문제.제목}  |  배점: ${문제.배점}  |  오답률: ${문제.오답률}</p>
                <p class="문제-내용">${강조하기(문제.내용, 검색어)}</p>
            </div>
            <div class="문제-선지">
                <strong>문제 선지:</strong>
                ${Object.entries(문제.선택지).map(([key, value]) => `<p class="선지">${key}: ${강조하기(value, 검색어)}</p>`).join('')}
            </div>
            <div class="토글-텍스트">
                <p><strong>정답:</strong> ${문제.정답}</p>
                <p><strong>출제의도:</strong> ${문제.출제의도}</p>
                <p><strong>해설:</strong> ${문제.해설}</p>
            </div>
            <div class="워터마크">My App</div>
        </div>
        `;

        숨겨진요소보이기();

        html2canvas(임시Div, {
            allowTaint: true,
            useCORS: true,
            scrollY: -window.scrollY,
            windowWidth: document.documentElement.offsetWidth,
            windowHeight: document.documentElement.offsetHeight
        }).then(canvas => {
            const 링크 = document.createElement('a');
            링크.href = canvas.toDataURL('image/png');
            링크.download = `${문제.연도}_${문제.학년}_${문제.날짜}_${문제.문항번호}.png`;
            링크.click();
            임시Div.remove();
            요소숨기기();
        }).catch(error => {
            console.error('이미지 저장 중 오류 발생:', error);
            임시Div.remove();
            요소숨기기();
        });
    }

    검색버튼.addEventListener('click', () => {
        const 검색어 = 검색어입력.value.trim();
        const 결과 = 문제목록.filter(문제 => {
            return 문제.내용.includes(검색어) || Object.values(문제.선택지).some(선지 => 선지.includes(검색어));
        });
        요약결과보여주기(결과, 검색어);
    });

    검색어입력.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            검색버튼.click();
        }
    });

    // 페이지 초기 로드 시 테마 설정
    if (localStorage.getItem('다크모드') === 'true') {
        document.body.classList.add('다크모드');
        테마토글버튼.querySelector('i').className = 'fas fa-moon';
    }

    테마토글버튼.addEventListener('click', () => {
        document.body.classList.toggle('다크모드');
        const isDarkMode = document.body.classList.contains('다크모드');
        localStorage.setItem('다크모드', isDarkMode);
        const icon = isDarkMode ? 'fas fa-moon' : 'fas fa-sun';
        테마토글버튼.querySelector('i').className = icon;
    });

    // Unsplash API 키 설정
    const UNSPLASH_KEY = 'YOUR_UNSPLASH_ACCESS_KEY'; // Unsplash에서 발급받은 API 키를 여기에 추가하세요.

    // 사진 가져오기 함수
    function 이미지요청하기(단어) {
        const apiUrl = `https://api.unsplash.com/search/photos?query=${단어}&client_id=${UNSPLASH_KEY}`;
        return fetch(apiUrl)
            .then(response => response.json())
            .then(data => data.results.length > 0 ? data.results[0].urls.small : null);
    }
});