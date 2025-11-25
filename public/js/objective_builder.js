// public/js/objective_builder.js
import { showToast } from './toast/toast.js';

document.addEventListener('DOMContentLoaded', () => {

    const config = window.OBJECTIVE_CONFIG || {};

    const levelsContainer = document.getElementById('levels-container');
    const addLevelBtn     = document.getElementById('add-level-btn');

    const tablesWrapper   = document.getElementById('tables-wrapper'); // conteneur des boutons 1..12
    const previewBox      = document.getElementById('preview-box');    // zone "Preview params"

    /* ======================================================
       UTILITAIRES GÉNÉRAUX
       ====================================================== */

    function getSelectedTables() {
        const btns = tablesWrapper
            ? tablesWrapper.querySelectorAll('.table-pill')
            : [];
        const res = [];
        btns.forEach(b => {
            if (b.classList.contains('active')) {
                res.push(b.dataset.value || b.textContent.trim());
            }
        });
        return res;
    }

    function computeFactsCountForCard(card) {
        const tables = getTasksTablesForCard(card);
        const min = parseInt(card.dataset.intervalMin || '1', 10);
        const max = parseInt(card.dataset.intervalMax || '10', 10);
        const range = Math.max(0, max - min + 1);
        return tables.length * range;
    }

    function getTasksMap(card) {
        try {
            const raw = card.dataset.tasks || '{}';
            const obj = JSON.parse(raw);
            return obj && typeof obj === 'object' ? obj : {};
        } catch (e) {
            return {};
        }
    }

    function setTasksMap(card, map) {
        card.dataset.tasks = JSON.stringify(map || {});
    }

    function getTasksTablesForCard(card) {
        try {
            const raw = card.dataset.tables || '[]';
            const obj = JSON.parse(raw);
            if (Array.isArray(obj) && obj.length) return obj;
        } catch (e) {}
        // fallback sur sélection globale
        return getSelectedTables();
    }

    function updateFactsCount(card) {
        const count = computeFactsCountForCard(card);
        const span = card.querySelector('[data-facts-count]');
        if (span) span.textContent = count;
    }

    function updatePreview() {
        if (!previewBox) return;

        const tables = getSelectedTables();
        if (!tables.length) {
            previewBox.textContent = 'Aucune table sélectionnée.';
            return;
        }

        const samples = [];
        const min = 1;
        const max = 10;

        for (let i = 0; i < 8; i++) {
            const t = tables[i % tables.length];
            const x = Math.floor(Math.random() * (max - min + 1)) + min;
            samples.push(`${t} x ${x} = ${t * x}`);
        }

        previewBox.innerHTML = samples
            .map(s => `<div>${s}</div>`)
            .join('');
    }

    function getJson(url) {
        return fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(r => r.json());
    }

    /* ======================================================
       INIT DES BOUTONS DE TABLES (1..12)
       ====================================================== */

    if (tablesWrapper) {
        tablesWrapper.querySelectorAll('.table-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');

                // mise à jour sur chaque niveau
                const selectedTables = getSelectedTables();

                document.querySelectorAll('.level-card').forEach(card => {
                    card.dataset.tables = JSON.stringify(selectedTables);
                    updateFactsCount(card);
                });

                updatePreview();
            });
        });

        updatePreview();
    }

    /* ======================================================
       INIT DES NIVEAUX EXISTANTS
       ====================================================== */

    function initAllLevelCards() {
        if (!levelsContainer) return;
        const cards = levelsContainer.querySelectorAll('.level-card');
        cards.forEach(card => initLevelCard(card));
    }

    function initLevelCard(card) {
        if (!card) return;

        const equalGroup  = card.querySelector('.equal-position-group');
        const factorGroup = card.querySelector('.factor-position-group');
        const intervalSlider = card.querySelector('.level-interval-slider');
        const deleteBtn   = card.querySelector('.delete-level-btn');
        const saveBtn     = card.querySelector('.save-level-btn');
        const toggleBtn   = card.querySelector('.toggle-level-details');

        // ----- ouverture / fermeture détails -----
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                card.classList.toggle('collapsed');
            });
        }

        // ----- init positions égal / facteur -----
        const eqValue = card.dataset.equalPosition || 'RIGHT';
        const facValue = card.dataset.factorPosition || 'OPERAND_TABLE';

        if (equalGroup) {
            equalGroup.querySelectorAll('button').forEach(btn => {
                if (btn.dataset.value === eqValue) {
                    btn.classList.add('active');
                }
                btn.addEventListener('click', () => {
                    equalGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    card.dataset.equalPosition = btn.dataset.value;
                    updateFactsCount(card);
                });
            });
        }

        if (factorGroup) {
            factorGroup.querySelectorAll('button').forEach(btn => {
                if (btn.dataset.value === facValue) {
                    btn.classList.add('active');
                }
                btn.addEventListener('click', () => {
                    factorGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    card.dataset.factorPosition = btn.dataset.value;
                    updateFactsCount(card);
                });
            });
        }

        // ----- intervalle -----
        const minSpan = card.querySelector('[data-interval-min]');
        const maxSpan = card.querySelector('[data-interval-max]');

        if (intervalSlider) {
            intervalSlider.value = card.dataset.intervalMax || '10';

            intervalSlider.addEventListener('input', () => {
                const max = parseInt(intervalSlider.value, 10);
                const min = parseInt(card.dataset.intervalMin || '1', 10);

                card.dataset.intervalMax = String(max);
                if (maxSpan) maxSpan.textContent = String(max);
                if (minSpan) minSpan.textContent = String(min);

                updateFactsCount(card);
                updatePreview();
            });
        }

        updateFactsCount(card);

        // ----- suppression niveau -----
        if (deleteBtn && config.deleteLevelUrlTemplate) {
            deleteBtn.addEventListener('click', async () => {
                if (!confirm('Supprimer ce niveau ?')) return;

                const levelId = card.dataset.levelId;
                const url = config.deleteLevelUrlTemplate.replace('__LEVEL_ID__', levelId);

                try {
                    const resp = await fetch(url, {
                        method: 'DELETE',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });

                    if (!resp.ok) {
                        showToast(false);
                        return;
                    }

                    const data = await resp.json();
                    if (!data.success) {
                        showToast(false);
                        return;
                    }

                    card.remove();
                    showToast(true);

                } catch (e) {
                    showToast(false);
                }
            });
        }

        // ----- sauvegarde niveau -----
        if (saveBtn && config.saveLevelUrlTemplate) {
            saveBtn.addEventListener('click', async () => {
                const levelId = card.dataset.levelId;
                const url = config.saveLevelUrlTemplate.replace('__LEVEL_ID__', levelId);

                const nameInput = card.querySelector('.level-name-input');
                const name = nameInput ? nameInput.value.trim() : '';

                const intervalMin = parseInt(card.dataset.intervalMin || '1', 10);
                const intervalMax = parseInt(card.dataset.intervalMax || '10', 10);

                const eqBtnActive = equalGroup
                    ? equalGroup.querySelector('button.active')
                    : null;
                const factorBtnActive = factorGroup
                    ? factorGroup.querySelector('button.active')
                    : null;

                const equalPosition  = eqBtnActive ? eqBtnActive.dataset.value : 'RIGHT';
                const factorPosition = factorBtnActive ? factorBtnActive.dataset.value : 'OPERAND_TABLE';

                const tables = getTasksTablesForCard(card);

                const payload = {
                    name,
                    tables,
                    intervalMin,
                    intervalMax,
                    equalPosition,
                    factorPosition
                };

                try {
                    const resp = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!resp.ok) {
                        showToast(false);
                        return;
                    }

                    const data = await resp.json();
                    if (!data.success) {
                        showToast(false);
                        return;
                    }

                    showToast(true);
                } catch (e) {
                    showToast(false);
                }
            });
        }

        // ----- clic sur une tâche (pills) -----
        card.querySelectorAll('.task-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const levelId = card.dataset.levelId;
                const taskType = pill.dataset.taskType;
                openTaskModal(card, levelId, taskType);
            });
        });
    }

    initAllLevelCards();

    /* ======================================================
       AJOUT D’UN NIVEAU
       ====================================================== */

    if (addLevelBtn && config.addLevelUrl) {
        addLevelBtn.addEventListener('click', async () => {
            try {
                const resp = await fetch(config.addLevelUrl, {
                    method: 'POST',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });

                if (!resp.ok) {
                    showToast(false);
                    return;
                }

                const data = await resp.json();
                if (!data.success || !data.html) {
                    showToast(false);
                    return;
                }

                const temp = document.createElement('div');
                temp.innerHTML = data.html.trim();
                const newCard = temp.firstElementChild;

                if (levelsContainer && newCard) {
                    levelsContainer.appendChild(newCard);
                    initLevelCard(newCard);
                    showToast(true);
                }

            } catch (e) {
                showToast(false);
            }
        });
    }

    /* ======================================================
       GESTION DES MODALES DE TÂCHES
       ====================================================== */

    function openTaskModal(card, levelId, taskType) {
        const tasksMap = getTasksMap(card);
        const existing = tasksMap[taskType] || null;

        switch (taskType) {
            case 'C1':
                fillC1Modal(levelId, existing, card);
                break;
            case 'C2':
                fillC2Modal(levelId, existing, card);
                break;
            case 'REC':
                fillRECModal(levelId, existing, card);
                break;
            case 'ID':
                fillIDModal(levelId, existing, card);
                break;
            case 'MEMB':
                fillMEMBModal(levelId, existing, card);
                break;
        }
    }

    async function saveTask(levelId, payload, card, taskType, modalId) {
        if (!config.saveTaskUrlTemplate) return;

        const url = config.saveTaskUrlTemplate.replace('__LEVEL_ID__', levelId);

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                showToast(false);
                return;
            }

            const data = await resp.json();
            if (!data.success) {
                showToast(false);
                return;
            }

            const tasksMap = getTasksMap(card);
            tasksMap[taskType] = data.task;
            setTasksMap(card, tasksMap);

            const pill = card.querySelector(`.task-pill[data-task-type="${taskType}"]`);
            if (pill) pill.classList.add('task-active');

            const modalEl = document.getElementById(modalId);
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal?.hide();

            showToast(true);

        } catch (e) {
            showToast(false);
        }
    }

    async function deleteTask(levelId, taskType, card, modalId) {
        if (!config.deleteTaskUrlTemplate) return;

        const url = config.deleteTaskUrlTemplate.replace('__LEVEL_ID__', levelId);

        if (!confirm('Supprimer cette tâche ?')) return;

        try {
            const resp = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ taskType })
            });

            if (!resp.ok) {
                showToast(false);
                return;
            }
            const data = await resp.json();
            if (!data.success) {
                showToast(false);
                return;
            }

            const tasksMap = getTasksMap(card);
            delete tasksMap[taskType];
            setTasksMap(card, tasksMap);

            const pill = card.querySelector(`.task-pill[data-task-type="${taskType}"]`);
            if (pill) pill.classList.remove('task-active');

            const modalEl = document.getElementById(modalId);
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal?.hide();

            showToast(true);
        } catch (e) {
            showToast(false);
        }
    }

    /* ======================================================
       MODALE C1
       ====================================================== */

    function fillC1Modal(levelId, task, card) {
        const modalEl = document.getElementById('taskModalC1');
        if (!modalEl) return;

        const levelInput = document.getElementById('c1_levelId');
        if (levelInput) levelInput.value = levelId;

        const targets = (task && task.targets) || [];
        const tRes  = document.getElementById('c1_target_result');
        const tTab  = document.getElementById('c1_target_table');
        const tOp   = document.getElementById('c1_target_operand');

        if (tRes) tRes.checked  = targets.includes('RESULT');
        if (tTab) tTab.checked  = targets.includes('TABLE');
        if (tOp)  tOp.checked   = targets.includes('OPERAND');

        const modality = (task && task.answerModality) || 'INPUT';
        const modChoice = document.getElementById('c1_mod_choice');
        const modInput  = document.getElementById('c1_mod_input');

        if (modChoice) modChoice.checked = modality === 'CHOICE';
        if (modInput)  modInput.checked  = modality === 'INPUT';

        const nbIncorrect = (task && task.nbIncorrectChoices) != null ? task.nbIncorrectChoices : 3;
        const timeMax     = (task && task.timeMaxSecond) != null ? task.timeMaxSecond : 30;
        const successes   = (task && task.successiveSuccessesToReach) != null ? task.successiveSuccessesToReach : 1;

        const nbIncSlider = document.getElementById('c1_nbIncorrect');
        const timeSlider  = document.getElementById('c1_time');
        const succSlider  = document.getElementById('c1_successes');

        const nbIncVal = document.getElementById('c1_nbIncorrect_value');
        const timeVal  = document.getElementById('c1_time_value');
        const succVal  = document.getElementById('c1_successes_value');

        if (nbIncSlider) nbIncSlider.value = nbIncorrect;
        if (timeSlider)  timeSlider.value  = timeMax;
        if (succSlider)  succSlider.value  = successes;

        if (nbIncVal) nbIncVal.textContent = nbIncorrect;
        if (timeVal)  timeVal.textContent  = timeMax;
        if (succVal)  succVal.textContent  = successes;

        if (nbIncSlider) nbIncSlider.oninput = () => {
            if (nbIncVal) nbIncVal.textContent = nbIncSlider.value;
        };
        if (timeSlider) timeSlider.oninput = () => {
            if (timeVal) timeVal.textContent = timeSlider.value;
        };
        if (succSlider) succSlider.oninput = () => {
            if (succVal) succVal.textContent = succSlider.value;
        };

        // exclusivité des modalités
        document.querySelectorAll('.c1-modality').forEach(chk => {
            chk.addEventListener('change', () => {
                if (chk.checked) {
                    document.querySelectorAll('.c1-modality').forEach(o => {
                        if (o !== chk) o.checked = false;
                    });
                }
            });
        });

        const deleteBtn = document.getElementById('c1_deleteBtn');
        if (deleteBtn) {
            if (task && task.id) {
                deleteBtn.classList.remove('d-none');
                deleteBtn.onclick = () => deleteTask(levelId, 'C1', card, 'taskModalC1');
            } else {
                deleteBtn.classList.add('d-none');
                deleteBtn.onclick = null;
            }
        }

        const confirmBtn = document.getElementById('c1_confirmBtn');
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                const targ = [];
                if (tRes && tRes.checked) targ.push('RESULT');
                if (tTab && tTab.checked) targ.push('TABLE');
                if (tOp  && tOp.checked)  targ.push('OPERAND');

                const mode = (modChoice && modChoice.checked) ? 'CHOICE' : 'INPUT';

                const payload = {
                    taskType: 'C1',
                    targets: targ,
                    answerModality: mode,
                    nbIncorrectChoices: nbIncSlider ? parseInt(nbIncSlider.value, 10) : 3,
                    timeMaxSecond: timeSlider ? parseInt(timeSlider.value, 10) : 30,
                    successiveSuccessesToReach: succSlider ? parseInt(succSlider.value, 10) : 1
                };

                await saveTask(levelId, payload, card, 'C1', 'taskModalC1');
            };
        }

        new bootstrap.Modal(modalEl).show();
    }

    /* ======================================================
       MODALE C2
       ====================================================== */

    function fillC2Modal(levelId, task, card) {
        const modalEl = document.getElementById('taskModalC2');
        if (!modalEl) return;

        const levelInput = document.getElementById('c2_levelId');
        if (levelInput) levelInput.value = levelId;

        const targets = (task && task.targets) || [];
        const tOT = document.getElementById('c2_target_operand_table');
        const tOR = document.getElementById('c2_target_operand_result');
        const tTR = document.getElementById('c2_target_table_result');

        if (tOT) tOT.checked = targets.includes('OPERAND_TABLE');
        if (tOR) tOR.checked = targets.includes('OPERAND_RESULT');
        if (tTR) tTR.checked = targets.includes('TABLE_RESULT');

        const nbIncorrect = (task && task.nbIncorrectChoices) != null ? task.nbIncorrectChoices : 3;
        const timeMax     = (task && task.timeMaxSecond) != null ? task.timeMaxSecond : 20;
        const successes   = (task && task.successiveSuccessesToReach) != null ? task.successiveSuccessesToReach : 1;

        const nbIncSlider = document.getElementById('c2_nbIncorrect');
        const timeSlider  = document.getElementById('c2_time');
        const succSlider  = document.getElementById('c2_successes');

        const nbIncVal = document.getElementById('c2_nbIncorrect_value');
        const timeVal  = document.getElementById('c2_time_value');
        const succVal  = document.getElementById('c2_successes_value');

        if (nbIncSlider) nbIncSlider.value = nbIncorrect;
        if (timeSlider)  timeSlider.value  = timeMax;
        if (succSlider)  succSlider.value  = successes;

        if (nbIncVal) nbIncVal.textContent = nbIncorrect;
        if (timeVal)  timeVal.textContent  = timeMax;
        if (succVal)  succVal.textContent  = successes;

        if (nbIncSlider) nbIncSlider.oninput = () => {
            if (nbIncVal) nbIncVal.textContent = nbIncSlider.value;
        };
        if (timeSlider) timeSlider.oninput = () => {
            if (timeVal) timeVal.textContent = timeSlider.value;
        };
        if (succSlider) succSlider.oninput = () => {
            if (succVal) succVal.textContent = succSlider.value;
        };

        const deleteBtn = document.getElementById('c2_deleteBtn');
        if (deleteBtn) {
            if (task && task.id) {
                deleteBtn.classList.remove('d-none');
                deleteBtn.onclick = () => deleteTask(levelId, 'C2', card, 'taskModalC2');
            } else {
                deleteBtn.classList.add('d-none');
                deleteBtn.onclick = null;
            }
        }

        const confirmBtn = document.getElementById('c2_confirmBtn');
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                const targ = [];
                if (tOT && tOT.checked) targ.push('OPERAND_TABLE');
                if (tOR && tOR.checked) targ.push('OPERAND_RESULT');
                if (tTR && tTR.checked) targ.push('TABLE_RESULT');

                const payload = {
                    taskType: 'C2',
                    targets: targ,
                    nbIncorrectChoices: nbIncSlider ? parseInt(nbIncSlider.value, 10) : 3,
                    timeMaxSecond: timeSlider ? parseInt(timeSlider.value, 10) : 20,
                    successiveSuccessesToReach: succSlider ? parseInt(succSlider.value, 10) : 1
                };

                await saveTask(levelId, payload, card, 'C2', 'taskModalC2');
            };
        }

        new bootstrap.Modal(modalEl).show();
    }

    /* ======================================================
       MODALE REC
       ====================================================== */

    function fillRECModal(levelId, task, card) {
        const modalEl = document.getElementById('taskModalREC');
        if (!modalEl) return;

        const levelInput = document.getElementById('rec_levelId');
        if (levelInput) levelInput.value = levelId;

        const nbIncorrect = (task && task.nbIncorrectChoices) != null ? task.nbIncorrectChoices : 3;
        const timeMax     = (task && task.timeMaxSecond) != null ? task.timeMaxSecond : 20;
        const successes   = (task && task.successiveSuccessesToReach) != null ? task.successiveSuccessesToReach : 1;

        const nbIncSlider = document.getElementById('rec_nbIncorrect');
        const timeSlider  = document.getElementById('rec_time');
        const succSlider  = document.getElementById('rec_successes');

        const nbIncVal = document.getElementById('rec_nbIncorrect_value');
        const timeVal  = document.getElementById('rec_time_value');
        const succVal  = document.getElementById('rec_successes_value');

        if (nbIncSlider) nbIncSlider.value = nbIncorrect;
        if (timeSlider)  timeSlider.value  = timeMax;
        if (succSlider)  succSlider.value  = successes;

        if (nbIncVal) nbIncVal.textContent = nbIncorrect;
        if (timeVal)  timeVal.textContent  = timeMax;
        if (succVal)  succVal.textContent  = successes;

        if (nbIncSlider) nbIncSlider.oninput = () => {
            if (nbIncVal) nbIncVal.textContent = nbIncSlider.value;
        };
        if (timeSlider) timeSlider.oninput = () => {
            if (timeVal) timeVal.textContent = timeSlider.value;
        };
        if (succSlider) succSlider.oninput = () => {
            if (succVal) succVal.textContent = succSlider.value;
        };

        const deleteBtn = document.getElementById('rec_deleteBtn');
        if (deleteBtn) {
            if (task && task.id) {
                deleteBtn.classList.remove('d-none');
                deleteBtn.onclick = () => deleteTask(levelId, 'REC', card, 'taskModalREC');
            } else {
                deleteBtn.classList.add('d-none');
                deleteBtn.onclick = null;
            }
        }

        const confirmBtn = document.getElementById('rec_confirmBtn');
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                const payload = {
                    taskType: 'REC',
                    nbIncorrectChoices: nbIncSlider ? parseInt(nbIncSlider.value, 10) : 3,
                    timeMaxSecond: timeSlider ? parseInt(timeSlider.value, 10) : 20,
                    successiveSuccessesToReach: succSlider ? parseInt(succSlider.value, 10) : 1
                };

                await saveTask(levelId, payload, card, 'REC', 'taskModalREC');
            };
        }

        new bootstrap.Modal(modalEl).show();
    }

    /* ======================================================
       MODALE ID
       ====================================================== */

    function fillIDModal(levelId, task, card) {
        const modalEl = document.getElementById('taskModalID');
        if (!modalEl) return;

        const levelInput = document.getElementById('id_levelId');
        if (levelInput) levelInput.value = levelId;

        const nbFacts  = (task && task.nbFacts) != null ? task.nbFacts : 1;
        const timeMax  = (task && task.timeMaxSecond) != null ? task.timeMaxSecond : 20;
        const successes= (task && task.successiveSuccessesToReach) != null ? task.successiveSuccessesToReach : 1;
        const variation= (task && task.sourceVariation) || 'RESULT';

        const nbFactsSlider = document.getElementById('id_nbFacts');
        const timeSlider    = document.getElementById('id_time');
        const succSlider    = document.getElementById('id_successes');

        const nbFactsVal = document.getElementById('id_nbFacts_value');
        const timeVal    = document.getElementById('id_time_value');
        const succVal    = document.getElementById('id_successes_value');

        if (nbFactsSlider) nbFactsSlider.value = nbFacts;
        if (timeSlider)    timeSlider.value    = timeMax;
        if (succSlider)    succSlider.value    = successes;

        if (nbFactsVal) nbFactsVal.textContent = nbFacts;
        if (timeVal)    timeVal.textContent    = timeMax;
        if (succVal)    succVal.textContent    = successes;

        if (nbFactsSlider) nbFactsSlider.oninput = () => {
            if (nbFactsVal) nbFactsVal.textContent = nbFactsSlider.value;
        };
        if (timeSlider) timeSlider.oninput = () => {
            if (timeVal) timeVal.textContent = timeSlider.value;
        };
        if (succSlider) succSlider.oninput = () => {
            if (succVal) succVal.textContent = succSlider.value;
        };

        const varResult  = document.getElementById('id_var_result');
        const varOperand = document.getElementById('id_var_operand');

        if (varResult)  varResult.checked  = variation === 'RESULT';
        if (varOperand) varOperand.checked = variation === 'OPERAND';

        const deleteBtn = document.getElementById('id_deleteBtn');
        if (deleteBtn) {
            if (task && task.id) {
                deleteBtn.classList.remove('d-none');
                deleteBtn.onclick = () => deleteTask(levelId, 'ID', card, 'taskModalID');
            } else {
                deleteBtn.classList.add('d-none');
                deleteBtn.onclick = null;
            }
        }

        const confirmBtn = document.getElementById('id_confirmBtn');
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                let srcVar = 'RESULT';
                if (varOperand && varOperand.checked) srcVar = 'OPERAND';

                const payload = {
                    taskType: 'ID',
                    nbFacts: nbFactsSlider ? parseInt(nbFactsSlider.value, 10) : 1,
                    sourceVariation: srcVar,
                    timeMaxSecond: timeSlider ? parseInt(timeSlider.value, 10) : 20,
                    successiveSuccessesToReach: succSlider ? parseInt(succSlider.value, 10) : 1
                };

                await saveTask(levelId, payload, card, 'ID', 'taskModalID');
            };
        }

        new bootstrap.Modal(modalEl).show();
    }

    /* ======================================================
       MODALE MEMB
       ====================================================== */

    function fillMEMBModal(levelId, task, card) {
        const modalEl = document.getElementById('taskModalMEMB');
        if (!modalEl) return;

        const levelInput = document.getElementById('memb_levelId');
        if (levelInput) levelInput.value = levelId;

        const nbIncorrect = (task && task.nbIncorrectChoices) != null ? task.nbIncorrectChoices : 0;
        const nbCorrect   = (task && task.nbCorrectChoices) != null ? task.nbCorrectChoices : 0;
        const timeMax     = (task && task.timeMaxSecond) != null ? task.timeMaxSecond : 20;
        const successes   = (task && task.successiveSuccessesToReach) != null ? task.successiveSuccessesToReach : 1;
        const target      = (task && task.target) || 'CORRECT';

        const nbIncSlider = document.getElementById('memb_nbIncorrect');
        const nbCorSlider = document.getElementById('memb_nbCorrect');
        const timeSlider  = document.getElementById('memb_time');
        const succSlider  = document.getElementById('memb_successes');

        const nbIncVal = document.getElementById('memb_nbIncorrect_value');
        const nbCorVal = document.getElementById('memb_nbCorrect_value');
        const timeVal  = document.getElementById('memb_time_value');
        const succVal  = document.getElementById('memb_successes_value');

        if (nbIncSlider) nbIncSlider.value = nbIncorrect;
        if (nbCorSlider) nbCorSlider.value = nbCorrect;
        if (timeSlider)  timeSlider.value  = timeMax;
        if (succSlider)  succSlider.value  = successes;

        if (nbIncVal) nbIncVal.textContent = nbIncorrect;
        if (nbCorVal) nbCorVal.textContent = nbCorrect;
        if (timeVal)  timeVal.textContent  = timeMax;
        if (succVal)  succVal.textContent  = successes;

        if (nbIncSlider) nbIncSlider.oninput = () => {
            if (nbIncVal) nbIncVal.textContent = nbIncSlider.value;
        };
        if (nbCorSlider) nbCorSlider.oninput = () => {
            if (nbCorVal) nbCorVal.textContent = nbCorSlider.value;
        };
        if (timeSlider) timeSlider.oninput = () => {
            if (timeVal) timeVal.textContent = timeSlider.value;
        };
        if (succSlider) succSlider.oninput = () => {
            if (succVal) succVal.textContent = succSlider.value;
        };

        const targetCorrect   = document.getElementById('memb_target_correct');
        const targetIncorrect = document.getElementById('memb_target_incorrect');

        if (targetCorrect)   targetCorrect.checked   = target === 'CORRECT';
        if (targetIncorrect) targetIncorrect.checked = target === 'INCORRECT';

        const deleteBtn = document.getElementById('memb_deleteBtn');
        if (deleteBtn) {
            if (task && task.id) {
                deleteBtn.classList.remove('d-none');
                deleteBtn.onclick = () => deleteTask(levelId, 'MEMB', card, 'taskModalMEMB');
            } else {
                deleteBtn.classList.add('d-none');
                deleteBtn.onclick = null;
            }
        }

        const confirmBtn = document.getElementById('memb_confirmBtn');
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                let tgt = 'CORRECT';
                if (targetIncorrect && targetIncorrect.checked) tgt = 'INCORRECT';

                const payload = {
                    taskType: 'MEMB',
                    target: tgt,
                    nbIncorrectChoices: nbIncSlider ? parseInt(nbIncSlider.value, 10) : 0,
                    nbCorrectChoices: nbCorSlider ? parseInt(nbCorSlider.value, 10) : 0,
                    timeMaxSecond: timeSlider ? parseInt(timeSlider.value, 10) : 20,
                    successiveSuccessesToReach: succSlider ? parseInt(succSlider.value, 10) : 1
                };

                await saveTask(levelId, payload, card, 'MEMB', 'taskModalMEMB');
            };
        }

        new bootstrap.Modal(modalEl).show();
    }

});
