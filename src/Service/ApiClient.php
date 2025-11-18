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

    public function fetchTeacherData(string $teacherId): ?array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::GET_TEACHER . $teacherId;
        $response = $this->client->request('GET', $url);

        return $response->getStatusCode() === 200 ? $response->toArray() : null;
    }

    public function fetchStudentsByTeacherAndClass(string $teacherId, string $classId): array
    {
        $url = ApiEndpoints::BASE_URL . 'data/students/teachers/' . $teacherId . '/classroom/' . $classId;
        $response = $this->client->request('GET', $url);

        return $response->getStatusCode() === 200 ? $response->toArray() : [];
    }

    public function fetchLearningPathByLearner(string $learnerId): ?array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::GET_LEARNINGPATH . $learnerId;
        $response = $this->client->request('GET', $url);

        return $response->getStatusCode() === 200 ? $response->toArray() : null;
    }

    public function fetchAllTeachers(): array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::GET_TEACHERS;
        $response = $this->client->request('GET', $url);

        return $response->getStatusCode() === 200 ? $response->toArray() : [];
    }

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
        $content = $response->getContent(false);

        // succès API = status 2xx (comme Unity)
        if ($status >= 200 && $status < 300) {
            return true;
        }

        return false;
    }


    public function fetchLearnerStatistics(string $learnerId): ?array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::STATS_URL . $learnerId;
        $response = $this->client->request('GET', $url);

        return $response->getStatusCode() === 200 ? $response->toArray() : null;
    }

    public function fetchLearnerStore(string $learnerId): ?array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::EQUIP_URL . $learnerId;
        $response = $this->client->request('GET', $url);

        return $response->getStatusCode() === 200 ? $response->toArray() : null;
    }

    /**
     * Met à jour un élève existant dans /data/student (PUT)
     */
    public function updateLearnerData(string $classId, string $learnerId, string $prenom, string $nom): bool
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::MODIF_STUDENT;

        $payload = [
            'idClasse'    => $classId,
            'idStudent'   => $learnerId,
            'nomEleve'    => $nom,
            'prenomEleve' => $prenom,
        ];

        $response = $this->client->request('PUT', $url, [
            'json' => $payload,
        ]);

        return $response->getStatusCode() === 200;
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

        $status = $response->getStatusCode();

        if ($status < 200 || $status >= 300) {
            // Utile pour débug (à activer si besoin)
            // dump($status, $response->getContent(false));
            return false;
        }

        return true;
    }
}
