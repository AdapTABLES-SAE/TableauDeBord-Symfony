<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use App\Constant\ApiEndpoints;
use App\Entity\Eleve;
use App\Entity\Entrainement;

class ApiClient
{
    public function __construct(
        private HttpClientInterface $client,
        private TrainingSerializer $trainingSerializer,
    ) {}

    /**
     * Récupère un enseignant depuis /data/teacher/{idProf}
     */
    public function fetchTeacherData(string $teacherId): ?array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::GET_TEACHER . $teacherId;

        $response = $this->client->request('GET', $url);

        return $response->getStatusCode() === 200
            ? $response->toArray()
            : null;
    }

    /**
     * Récupère les élèves d'une classe :
     * /data/students/teacher/{teacherId}/classroom/{classId}
     */
    public function fetchStudentsByTeacherAndClass(string $teacherId, string $classId): array
    {
        // ⚠ Correction IMPORTANTE : teacher (singulier)
        $url =
            ApiEndpoints::BASE_URL .
            ApiEndpoints::GET_STUDENTS_1 . $teacherId . "/" .
            ApiEndpoints::GET_STUDENTS_2. $classId;

        $response = $this->client->request('GET', $url);

        return $response->getStatusCode() === 200
            ? $response->toArray()
            : [];
    }

    /**
     * Récupère un LearningPath complet d'un élève :
     * /path/training/learner/{learnerId}
     */
    public function fetchLearningPathByLearner(string $learnerId): ?array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::GET_LEARNINGPATH . $learnerId;

        $response = $this->client->request('GET', $url);

        return $response->getStatusCode() === 200
            ? $response->toArray()
            : null;
    }

    /**
     * Récupère la liste de tous les enseignants :
     * /data/teachers/
     */
    public function fetchAllTeachers(): array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::GET_TEACHERS;

        $response = $this->client->request('GET', $url);

        return $response->getStatusCode() === 200
            ? $response->toArray()
            : [];
    }

    /**
     * Crée un nouvel enseignant :
     * POST /data/teacher/
     */
    public function createTeacher(string $idProf, string $name): array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::ADD_PROF;

        try {
            $response = $this->client->request('POST', $url, [
                'json' => [
                    'idProf' => $idProf,
                    'name'   => $name,
                ],
            ]);

            $status = $response->getStatusCode();
            $content = trim($response->getContent(false));

            if ($status >= 200 && $status < 300) {
                return ['success' => true];
            }

            if (str_contains(strtolower($content), 'already') || str_contains($content, 'existe')) {
                return [
                    'success' => false,
                    'error' => "Un enseignant avec cet identifiant existe déjà."
                ];
            }

            return [
                'success' => false,
                'error' => "Erreur API : code HTTP $status"
            ];

        } catch (\Exception $e) {

            return [
                'success' => false,
                'error' => "Connexion impossible à l'API."
            ];
        }
    }


    /**
     * Supprimer un Enseignant
     */
    public function deleteTeacher(string $idProf): bool
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::DELETE_PROF . $idProf;

        $response = $this->client->request('DELETE', $url);

        $status = $response->getStatusCode();

        // L'API renvoie un body vide quand c'est OK
        return $status >= 200 && $status < 300;
    }


    /**
     * Statistiques d'un élève :
     * /statistics/learner/{learner}
     */
    public function fetchLearnerStatistics(string $learnerId): ?array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::STATS_URL . $learnerId;

        $response = $this->client->request('GET', $url);

        return $response->getStatusCode() === 200
            ? $response->toArray()
            : null;
    }

    /**
     * Récupère la progression d'un élève pour un objectif + niveau.
     *
     * Correspond à :
     *   GET /results/learner/{learnerID}/objective/{objID}/level/{levelID}
     *
     * Retourne null si l'appel échoue ou n'est pas en 200.
     */
    public function fetchObjectiveLevelResults(string $learnerId, string $objectiveId, string $levelId): ?array
    {
        $url = ApiEndpoints::BASE_URL
            . ApiEndpoints::GET_LEVEL_1 . $learnerId . '/'
            . ApiEndpoints::GET_LEVEL_2 . $objectiveId . '/'
            . ApiEndpoints::GET_LEVEL_3 . $levelId;

        try {
            $response = $this->client->request('GET', $url);

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            // Exemple JSON :
            // {
            //   "globalEncounters": 0,
            //   "progresses": [
            //     { "idTask": "...", "currentSuccess": 0, "currentEncounters": 0, "typeTask": "C1" }
            //   ],
            //   "globalSuccess": 0
            // }
            return $response->toArray(false);
        } catch (\Throwable $e) {
            // Erreur réseau, 500, etc. => on considère "pas de données"
            return null;
        }
    }


    /**
     * Inventaire store d'un élève :
     * /store/learner/{learner}
     */
    public function fetchLearnerStore(string $learnerId): ?array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::EQUIP_URL . $learnerId;

        $response = $this->client->request('GET', $url);

        return $response->getStatusCode() === 200 ? $response->toArray() : null;
    }

    public function updateClassroomName(string $classId, string $name): bool {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::MODIF_CLASSROOM;

        $payload = [
            'id' => $classId,
            'name' => $name
        ];

        $response = $this->client->request('PUT', $url, [
            'json' => $payload
        ]);

        return $response->getStatusCode() === 200;
    }

    /**
     * Mettre à jour un élève :
     * PUT /data/student
     */
    public function updateLearnerData(string $classId, string $learnerId, string $prenom, string $nom): bool
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::MODIF_STUDENT;

        $payload = [
            'idClasse' => $classId,
            'idStudent' => $learnerId,
            'nomEleve' => $nom,
            'prenomEleve' => $prenom,
        ];

        $response = $this->client->request('PUT', $url, [
            'json' => $payload,
        ]);

        return ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300);
    }
    public function deleteStudent(string $teacherId, string $classId, string $studentId): bool
    {
        $url = ApiEndpoints::BASE_URL .
            ApiEndpoints::DELETE_STUDENT_1 . $teacherId . "/" .
            ApiEndpoints::DELETE_STUDENT_2 . $classId . "/"
            . ApiEndpoints::DELETE_STUDENT_3 . $studentId;

        $response = $this->client->request('DELETE', $url);

        return $response->getStatusCode() === 200;
    }

    public function addStudent(string $classId, string $studentId, string $nomEleve, string $prenomEleve): bool
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::ADD_STUDENT;

        $payload = [
            'idClasse'    => $classId,
            'idStudent'   => $studentId,
            'nomEleve'    => $nomEleve,
            'prenomEleve' => $prenomEleve,
        ];

        $response = $this->client->request('POST', $url, [
            'json' => $payload,
        ]);

        return ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300);
    }


    /**
     * Envoie / met à jour un parcours complet dans /path/training
     * Important : la structure doit coller à ce que ton PathManager Java attend.
     */
    public function assignTrainingToLearner(Eleve $eleve, Entrainement $entrainement): bool
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::SAVE_LEARNINGPATH;

        $payload = $this->trainingSerializer->toApiPayload($entrainement, $eleve);

        $response = $this->client->request('POST', $url, [
            'json' => $payload,
        ]);

        return ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300);
    }

    /*
     * Statistique d'un élève
     */
    public function getLearnerStats(string $learnerId): ?array
    {
        try {
            $url = ApiEndpoints::BASE_URL . ApiEndpoints::STATS_URL . $learnerId;

            $response = $this->client->request('GET', $url);

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            return $response->toArray();
        } catch (\Throwable $e) {
            return null;
        }
    }


    public function fetchLearnerInventory(string $learnerId): array
    {
        $url = ApiEndpoints::BASE_URL . "store/learner/" . $learnerId;

        try {
            $response = $this->client->request('GET', $url);

            if ($response->getStatusCode() !== 200) {
                return ['items' => []];
            }

            return $response->toArray();

        } catch (\Exception $e) {
            return ['items' => []];
        }
    }


    public function updateLearnerEquipment(string $learnerId, array $items): array
    {
        $url = ApiEndpoints::BASE_URL . 'store';

        try {
            $response = $this->client->request('POST', $url, [
                'json' => [
                    'learnerID' => $learnerId,
                    'items'     => $items,
                    'usedCoins' => 0,
                ],
            ]);

            $status = $response->getStatusCode();
            $ok = ($status >= 200 && $status < 300);

            $headers = $response->getHeaders(false);
            $contentLength = $headers['content-length'][0] ?? null;
            $hasBody = $contentLength !== null && (int) $contentLength > 0;

            return [
                'success'  => $ok,
                'response' => $hasBody ? $response->toArray(false) : null,
            ];

        } catch (\Throwable $e) {
            return [
                'success' => false,
                'error'   => $e->getMessage(),
            ];
        }
    }

}
