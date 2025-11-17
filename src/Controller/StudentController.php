<?php

namespace App\Controller;

use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Service\ApiClient;
use App\Service\TrainingAssignmentService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\JsonResponse;

class StudentController extends AbstractController
{
    public function __construct(
        private ApiClient $apiClient,
        private TrainingAssignmentService $trainingAssignmentService,
        private EntityManagerInterface $em,
    ) {}

    #[Route('/enseignant/classes/{learnerId}', name: 'teacher_student_view')]
    public function view(string $learnerId, Request $request): Response
    {
        $eleve = $this->em->getRepository(Eleve::class)->findOneBy(['learnerId' => $learnerId]);
        if (!$eleve) {
            throw $this->createNotFoundException("Élève introuvable");
        }

        $enseignant = $eleve->getClasse()?->getEnseignant();

        $entrainementsDisponibles = $enseignant
            ? $this->em->getRepository(Entrainement::class)->findBy(['enseignant' => $enseignant])
            : [];

        if ($request->isMethod('POST')) {
            $prenom = trim((string) $request->request->get('prenomEleve', ''));
            $nom    = trim((string) $request->request->get('nomEleve', ''));

            $hasChanged = false;

            if ($prenom !== '' && $prenom !== $eleve->getPrenomEleve()) {
                $eleve->setPrenomEleve($prenom);
                $hasChanged = true;
            }
            if ($nom !== '' && $nom !== $eleve->getNomEleve()) {
                $eleve->setNomEleve($nom);
                $hasChanged = true;
            }

            if ($hasChanged) {
                $this->em->flush();

                $classId = $eleve->getClasse()?->getIdClasse() ?? 'default';
                $success = $this->apiClient->updateLearnerData(
                    $classId,
                    $eleve->getLearnerId(),
                    $eleve->getPrenomEleve(),
                    $eleve->getNomEleve()
                );

                if ($success) {
                    $this->addFlash('success', 'Informations mises à jour localement et sur l’API.');
                } else {
                    $this->addFlash('warning', 'Sauvegardé localement, mais échec de mise à jour sur l’API.');
                }
            } else {
                $this->addFlash('info', 'Aucune modification détectée.');
            }

            // En cas d’ajax, on peut renvoyer un JSON simple
            if ($request->isXmlHttpRequest()) {
                return new JsonResponse(['success' => $hasChanged]);
            }
        }

        return $this->render('student/view.html.twig', [
            'eleve'              => $eleve,
            'classe'             => $eleve->getClasse(),
            'entrainements'      => $entrainementsDisponibles,
            'entrainementActuel' => $eleve->getEntrainement(),
        ]);
    }

    #[Route('/enseignant/classes/{learnerId}/entrainement', name: 'ajax_update_training', methods: ['POST'])]
    public function updateTrainingAjax(string $learnerId, Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $entrainementId = $data['entrainementId'] ?? null;

        if (!$entrainementId) {
            return new JsonResponse(['success' => false, 'message' => 'Aucun ID entraînement fourni'], 400);
        }

        $eleve = $this->em->getRepository(Eleve::class)->findOneBy(['learnerId' => $learnerId]);
        $entrainement = $this->em->getRepository(Entrainement::class)->find($entrainementId);

        if (!$eleve || !$entrainement) {
            return new JsonResponse(['success' => false, 'message' => 'Élève ou entraînement introuvable'], 404);
        }

        $ok = $this->trainingAssignmentService->assignTraining($eleve, $entrainement);

        if (!$ok) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour sur l’API.',
            ], 500);
        }

        return new JsonResponse([
            'success'          => true,
            'message'          => 'Nouvel entraînement attribué avec succès.',
            'entrainementName' => $entrainement->getObjectifs()->first()?->getName() ?? 'Sans nom',
        ]);
    }
}
