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
    const UNSPLASH_ACCESS_KEY = 'c6fLotA-bRLbvx-xrNBgB6WRPYl8gfthXPl3Z8tEugk';
    
    const recentSearches = JSON.parse(localStorage.getItem('최근검색어')) || [];

    function 최근검색어표시() {
        if (최근검색어) {
            최근검색어.querySelector('.recent-searches-container').innerHTML = `
                ${recentSearches.map((term, index) => `
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
                    recentSearches.splice(index, 1);
                    localStorage.setItem('최근검색어', JSON.stringify(recentSearches));
                    최근검색어표시();
                });
            });
        }
    }

    function toggleRecentSearches() {
        if (최근검색어.style.display === 'block') {
            최근검색어.style.display = 'none';
        } else {
            최근검색어.style.display = 'block';
            최근검색어표시();
        }
    }

    최근검색어버튼.addEventListener('click', toggleRecentSearches);

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

        if (!recentSearches.includes(검색어)) {
            recentSearches.unshift(검색어);
            if (recentSearches.length > 5) recentSearches.pop();
            localStorage.setItem('최근검색어', JSON.stringify(recentSearches));
            최근검색어표시();
        }

        단어상세정보.innerHTML = '';
        요약결과.innerHTML = '';
        문제결과.innerHTML = '';

        Promise.all([
            단어상세정보요청(검색어),
            문제요청(검색어),
            이미지요청(검색어)
        ])
        .then(([상세정보, 문제들, 이미지URL]) => {
            단어상세정보출력(상세정보, 검색어, 이미지URL);
            요약결과출력(문제들, 검색어);
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
        fetchSuggestions(query);
    });

    function fetchSuggestions(query) {
        const apiUrl = `https://api.datamuse.com/words?sp=${query}*`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                단어자동완성결과(data);
            })
            .catch(error => console.error('Error:', error));
    }

    function 단어자동완성결과(results) {
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

    function 단어상세정보요청(단어) {
        const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${단어}`;
        return fetch(apiUrl)
            .then(response => response.json())
            .then(data => ({
                정의: data[0].meanings[0].definitions[0].definition || '없음',
                예문: data[0].meanings[0].definitions[0].example || '없음',
                비슷한단어: data[0].meanings[0].definitions[0].synonyms || '없음'
            }));
    }

    function 문제요청(검색어) {
        return fetch('list.json')
            .then(response => response.json())
            .then(data => 문제필터링(data, 검색어));
    }

    function 문제필터링(데이터, 검색어) {
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

    function 단어상세정보출력(상세정보, 검색어, 이미지URL) {
        const { 정의, 예문, 비슷한단어 } = 상세정보;

        단어상세정보.innerHTML = `
            <h2>${검색어}</h2>
            <p><strong>정의:</strong> ${정의}</p>
            <p><strong>예문:</strong> ${예문}</p>
            <p><strong>비슷한 단어:</strong> ${비슷한단어.join(', ')}</p>
            ${이미지URL ? `<img src="${이미지URL}" alt="${검색어}">` : ''}
        `;
    }

    function 요약결과출력(문제들, 검색어) {
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
                <div class="summary-item">
                    <p data-problem='${JSON.stringify(문제)}'>
                        ${문제.연도}년 ${문제.학년} ${문제.날짜} ${문제.문항번호}번 문제 내용: ${강조(문제.내용, 검색어).substring(0, 50)}...
                    </p>
                </div>
            `).join('')}
            ${문제들.length > 최대결과수 ? '<p>총 ' + 문제들.length + '개의 결과가 있습니다.</p>' : ''}
        `;

        document.querySelectorAll('.summary-item p').forEach(p => {
            p.addEventListener('click', () => {
                const 문제 = JSON.parse(p.getAttribute('data-problem'));
                상세문제출력(문제, 검색어);
            });
        });
    }

    function 강조(텍스트, 검색어) {
        if (!검색어) return 텍스트;
        if (typeof 텍스트 !== 'string') return String(텍스트);
        const 정규식 = new RegExp(`(${검색어})`, 'gi');
        return 텍스트.replace(정규식, '<mark>$1</mark>');
    }

    function 상세문제출력(문제, 검색어) {
        문제결과.innerHTML = `
            <div class="result-item">
                <div class="header">
                    <p>${문제.연도}년 ${문제.학년} ${문제.날짜}</p>
                </div>
                <div class="problem">
                    <p class="problem-title">${문제.문항번호}번, ${문제.제목}  |  배점: ${문제.배점}  |  오답률: ${문제.오답률}</p>
                    <p class="problem-content">${강조(문제.내용, 검색어)}</p>
                </div>
                <div class="problem-options">
                    <strong>문제 선지:</strong>
                    ${Object.entries(문제.선택지).map(([key, value]) => `<p class="option">${key}: ${강조(value, 검색어)}</p>`).join('')}
                </div>
                <button class="toggle-button">정답 및 해설 보기</button>
                <div class="toggle-text" style="display: none;">
                    <p><strong>정답:</strong> ${문제.정답}</p>
                    <p><strong>출제의도:</strong> ${문제.출제의도}</p>
                    <p><strong>해설:</strong> ${문제.해설}</p>
                </div>
                <button id="downloadImageButton" class="icon-button">이미지로 저장</button>
            </div>
        `;
        토글버튼이벤트추가();
    
        // 다운로드 버튼 클릭 시 이미지로 변환
        document.getElementById('downloadImageButton').addEventListener('click', () => {
            이미지로변환하고다운로드(문제, 검색어);
        });
    }

    function 토글버튼이벤트추가() {
        document.querySelectorAll('.toggle-button').forEach(button => {
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

    function 이미지요청(단어) {
        const apiUrl = `https://api.unsplash.com/search/photos?query=${단어}&client_id=${UNSPLASH_ACCESS_KEY}`;
        return fetch(apiUrl)
            .then(response => response.json())
            .then(data => data.results.length > 0 ? data.results[0].urls.small : null);
    }

    테마토글버튼.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        const icon = isDarkMode ? 'fas fa-moon' : 'fas fa-sun';
        테마토글버튼.querySelector('i').className = icon;
    });


    function 이미지로변환하고다운로드(문제, 검색어) {
        // 문제 결과를 렌더링할 임시 div 생성
        const 임시Div = document.createElement('div');
        임시Div.style.position = 'absolute';
        임시Div.style.left = '-9999px'; // 화면에서 숨기기
        document.body.appendChild(임시Div);
    
        // 문제를 임시 div에 렌더링
        임시Div.innerHTML = `
            <div class="result-item">
                <div class="header">
                    <p>${문제.연도}년 ${문제.학년} ${문제.날짜}</p>
                </div>
                <div class="problem">
                    <p class="problem-title">${문제.문항번호}번, ${문제.제목}  |  배점: ${문제.배점}  |  오답률: ${문제.오답률}</p>
                    <p class="problem-content">${강조(문제.내용, 검색어)}</p>
                </div>
                <div class="problem-options">
                    <strong>문제 선지:</strong>
                    ${Object.entries(문제.선택지).map(([key, value]) => `<p class="option">${key}: ${강조(value, 검색어)}</p>`).join('')}
                </div>
                <button class="toggle-button">정답 및 해설 보기</button>
                <div class="toggle-text" style="display: none;">
                    <p><strong>정답:</strong> ${문제.정답}</p>
                    <p><strong>출제의도:</strong> ${문제.출제의도}</p>
                    <p><strong>해설:</strong> ${문제.해설}</p>
                </div>
            </div>
        `;
    
        // html2canvas를 사용하여 이미지로 변환
        html2canvas(임시Div).then(canvas => {
            // 이미지 URL 생성
            const 이미지URL = canvas.toDataURL('image/png');
            
            // 다운로드 링크 생성
            const 링크 = document.createElement('a');
            링크.href = 이미지URL;
            링크.download = '문제_상세정보.png';
            링크.click();
    
            // 임시 div 제거
            document.body.removeChild(임시Div);
        });
    }
});
