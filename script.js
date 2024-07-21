document.addEventListener('DOMContentLoaded', () => {
    const 검색버튼 = document.getElementById('searchButton');
    const 검색입력 = document.getElementById('searchInput');
    const 단어상세정보 = document.getElementById('wordDetails');
    const 요약결과 = document.getElementById('summaryResults');
    const 문제결과 = document.getElementById('results');

    검색버튼.addEventListener('click', () => {
        const 검색어 = 검색입력.value.trim().toLowerCase();
        if (검색어 === '') {
            alert('검색어를 입력하세요.');
            return;
        }

        단어상세정보.innerHTML = '';
        요약결과.innerHTML = '';
        문제결과.innerHTML = '';

        단어상세정보요청(검색어)
            .then(상세정보 => {
                단어상세정보출력(상세정보, 검색어);
                return 문제요청(검색어);
            })
            .then(문제들 => {
                요약결과출력(문제들, 검색어);
            })
            .catch(오류 => console.error('오류 발생:', 오류));
    });

    function 단어상세정보요청(단어) {
        const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${단어}`;
        return fetch(apiUrl)
            .then(response => response.json())
            .then(data => ({
                정의: data[0].meanings[0].definitions[0].definition,
                예문: data[0].meanings[0].definitions[0].example || '예문 없음',
                비슷한단어: data[0].meanings[0].definitions[0].synonyms ? data[0].meanings[0].definitions[0].synonyms.join(', ') : '없음'
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
                                배점: 문제['배점'] || '정보 없음',
                                오답률: 문제['오답률'] || '정보 없음',
                                출제의도: 문제['출제의도'] || '정보 없음'
                            });
                        }
                    });
                });
            }
        }
        return 결과.slice(0, 5);
    }

    function 단어상세정보출력(정보, 검색어) {
        단어상세정보.innerHTML = `
            <h2>단어 상세 정보</h2>
            <p><strong>정의:</strong> ${강조(정보.정의, 검색어)}</p>
            <p><strong>예문:</strong> ${강조(정보.예문, 검색어)}</p>
            <p><strong>비슷한 단어:</strong> ${강조(정보.비슷한단어, 검색어)}</p>
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
            </div>
        `;
        토글버튼이벤트추가();
    }


    function 강조(텍스트, 검색어) {
        if (!검색어) return 텍스트;
        const 정규식 = new RegExp(`(${검색어})`, 'gi');
        return 텍스트.replace(정규식, '<mark>$1</mark>');
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
});
