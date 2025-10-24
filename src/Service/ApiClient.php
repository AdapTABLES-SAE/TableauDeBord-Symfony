<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use App\Constant\ApiEndpoints;
use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Service\TrainingSerializer;

/**
 * Service utilitaire pour interagir avec l'API AdapTABLES.
 * Chaque méthode correspond à un endpoint spécifique.
 */
class ApiClient
{
    private HttpClientInterface $client;
    private ?TrainingSerializer $trainingSerializer = null;

    public function __construct(HttpClientInterface $client, ?TrainingSerializer $trainingSerializer = null)
    {
        $this->client = $client;
        $this->trainingSerializer = $trainingSerializer;
    }

    /**
     * Récupère les informations d'un enseignant depuis l'API
     * Endpoint : GET /data/teacher/{teacherID}
     */
    public function fetchTeacherData(string $teacherId): ?array
    {
        $url = ApiEndpoints::BASE_URL . ApiEndpoints::GET_TEACHER . $teacherId;

        try {
            $response = $this->client->request('GET', $url);
            if ($response->getStatusCode() === 200) {
                return $response->toArray();
            }
        } catch (\Throwable $e) {
            dump("X Erreur fetchTeacherData($teacherId) : " . $e->getMessage());
        }

        return null;
    }

    /**
     * Récupère les élèves d’une classe d’un enseignant
     * Endpoint : GET /data/students/teacher/{teacherID}/classroom/{classID}
     */
    public function fetchStudentsByTeacherAndClass(string $teacherId, string $classId): array
    {
        $url = ApiEndpoints::BASE_URL . 'data/students/teacher/' . $teacherId . '/classroom/' . $classId;

        try {
            $response = $this->client->request('GET', $url);
            if ($response->getStatusCode() === 200) {
                return $response->toArray();
            }
        } catch (\Throwable $e) {
            dump("X Erreur fetchStudentsByTeacherAndClass($teacherId/$classId) : " . $e->getMessage());
        }

        return [];
    }

    /**
     * Récupère le parcours d'apprentissage (training) d’un élève
     * Endpoint : GET /path/training/learner/{learnerId}
     */
    public function fetchLearningPathByLearner(string $learnerId): ?array
    {
        $url = ApiEndpoints::BASE_URL . 'path/training/learner/' . $learnerId;

        try {
            $response = $this->client->request('GET', $url);
            $status = $response->getStatusCode();

            if ($status !== 200) {
                dump("⚠️ API /path/training/learner/$learnerId → statut HTTP $status");
                return null;
            }

            $content = $response->getContent(false);
            $data = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE || !$data) {
                dump("⚠️ JSON invalide pour $learnerId : " . substr($content, 0, 300));
                return null;
            }

            if (!isset($data['learningPathID'])) {
                dump("⚠️ Données incomplètes pour $learnerId : ", $data);
                return null;
            }

            return $data;
        } catch (\Throwable $e) {
            dump("X Erreur fetchLearningPathByLearner($learnerId) : " . $e->getMessage());
            return null;
        }
    }

    /**
     * Récupère les statistiques générales d’un élève
     * Endpoint : GET /statistics/learner/{learnerId}
     */
    public function fetchLearnerStatistics(string $learnerId): ?array
    {
        $url = ApiEndpoints::BASE_URL . 'statistics/learner/' . $learnerId;

        try {
            $response = $this->client->request('GET', $url);
            return $response->getStatusCode() === 200 ? $response->toArray() : null;
        } catch (\Throwable $e) {
            dump("X Erreur fetchLearnerStatistics($learnerId) : " . $e->getMessage());
            return null;
        }
    }

    /**
     * Récupère les items d’un élève
     * Endpoint : GET /store/learner/{learnerId}
     */
    public function fetchLearnerStore(string $learnerId): ?array
    {
        $url = ApiEndpoints::BASE_URL . 'store/learner/' . $learnerId;

        try {
            $response = $this->client->request('GET', $url);
            return $response->getStatusCode() === 200 ? $response->toArray() : null;
        } catch (\Throwable $e) {
            dump("X Erreur fetchLearnerStore($learnerId) : " . $e->getMessage());
            return null;
        }
    }

    /**
     * Récupère les pièces d’un élève
     * Endpoint : GET /coins/learner/{learnerId}
     */
    public function fetchLearnerCoins(string $learnerId): ?array
    {
        $url = ApiEndpoints::BASE_URL . 'coins/learner/' . $learnerId;

        try {
            $response = $this->client->request('GET', $url);
            return $response->getStatusCode() === 200 ? $response->toArray() : null;
        } catch (\Throwable $e) {
            dump("X Erreur fetchLearnerCoins($learnerId) : " . $e->getMessage());
            return null;
        }
    }

    /**
     * Associe un entraînement à un élève (POST /path/training)
     * Envoie la structure complète du parcours
     */
    public function assignTrainingToLearner(Eleve $eleve, Entrainement $entrainement): void
    {
        if (!$this->trainingSerializer) {
            throw new \RuntimeException('TrainingSerializer non injecté dans ApiClient.');
        }

        $url = ApiEndpoints::BASE_URL . 'path/training';
        $payload = $this->trainingSerializer->toApiPayload($entrainement, $eleve);

        try {
            $response = $this->client->request('POST', $url, ['json' => $payload]);
            if ($response->getStatusCode() !== 200) {
                throw new \RuntimeException(
                    "Erreur API POST /path/training : " .
                    $response->getStatusCode() . ' - ' . $response->getContent(false)
                );
            }
        } catch (\Throwable $e) {
            dump("X assignTrainingToLearner({$eleve->getLearnerId()}) : " . $e->getMessage());
        }
    }

    /**
     * Modifie le prénom ou le nom de l'élève (PUT /data/students/learner/{learnerId})
     */
    public function updateLearnerData(string $classId, string $learnerId, string $prenom, string $nom): bool
    {
        $url = ApiEndpoints::BASE_URL . 'data/student';

        $payload = [
            'idClasse'    => $classId,
            'idStudent'   => $learnerId,
            'nomEleve'    => $nom,
            'prenomEleve' => $prenom
        ];

        try {
            $response = $this->client->request('PUT', $url, ['json' => $payload]);
            return $response->getStatusCode() === 200;
        } catch (\Throwable $e) {
            return false;
        }
    }
}
