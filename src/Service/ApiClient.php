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
        dd($url);

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
    public function createTeacher(string $idProf, string $name): bool
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::ADD_PROF;

        $response = $this->client->request('POST', $url, [
            'json' => [
                'idProf' => $idProf,
                'name'   => $name,
            ],
        ]);

        $status = $response->getStatusCode();

        // L’API Unity considère un retour vide = succès
        return ($status >= 200 && $status < 300);
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
     * ⚠️ Important : la structure doit coller à ce que ton PathManager Java attend.
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
}
