<?php

namespace App\Controller;

use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Service\ApiClient;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\JsonResponse;

class StudentController extends AbstractController
{
    private ApiClient $apiClient;

    public function __construct(ApiClient $apiClient)
    {
        $this->apiClient = $apiClient;
    }

    #[Route('/enseignant/classes/{learnerId}', name: 'teacher_student_view')]
    public function view(string $learnerId, EntityManagerInterface $em, Request $request): Response
    {
        $eleve = $em->getRepository(Eleve::class)->findOneBy(['learnerId' => $learnerId]);

        if (!$eleve) {
            throw $this->createNotFoundException("Élève introuvable");
        }

        $entrainementsDisponibles = $em->getRepository(Entrainement::class)->findAll();

        if ($request->isMethod('POST')) {
            $prenom = trim($request->request->get('prenomEleve'));
            $nom = trim($request->request->get('nomEleve'));

            $hasChanged = false;

            if ($prenom !== $eleve->getPrenomEleve()) {
                $eleve->setPrenomEleve($prenom);
                $hasChanged = true;
            }
            if ($nom !== $eleve->getNomEleve()) {
                $eleve->setNomEleve($nom);
                $hasChanged = true;
            }

            if ($hasChanged) {
                $em->flush();

                // Appel à l’API externe pour mettre à jour l’élève
                $classId = $eleve->getClasse()?->getIdClasse() ?? 'default';
                $success = $this->apiClient->updateLearnerData(
                    $classId,
                    $eleve->getLearnerId(),
                    $prenom,
                    $nom
                );

                if ($success) {
                    $this->addFlash('success', 'Informations mises à jour localement et sur l’API.');
                } else {
                    $this->addFlash('warning', 'Sauvegardé localement, mais échec de mise à jour sur l’API.');
                }
            } else {
                $this->addFlash('info', 'Aucune modification détectée.');
            }
        }

        return $this->render('student/view.html.twig', [
            'eleve' => $eleve,
            'classe' => $eleve->getClasse(),
            'entrainements' => $entrainementsDisponibles,
            'entrainementActuel' => $eleve->getEntrainement()
        ]);
    }

    #[Route('/enseignant/classes/{learnerId}/entrainement', name: 'ajax_update_training', methods: ['POST'])]
    public function updateTrainingAjax(string $learnerId, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $entrainementId = $data['entrainementId'] ?? null;

        if (!$entrainementId) {
            return new JsonResponse(['success' => false, 'message' => 'Aucun ID entraînement fourni'], 400);
        }

        $eleve = $em->getRepository(Eleve::class)->findOneBy(['learnerId' => $learnerId]);
        $entrainement = $em->getRepository(Entrainement::class)->find($entrainementId);

        if (!$eleve || !$entrainement) {
            return new JsonResponse(['success' => false, 'message' => 'Élève ou entraînement introuvable'], 404);
        }

        $eleve->setEntrainement($entrainement);
        $em->flush();

        return new JsonResponse([
            'success' => true,
            'message' => 'Nouvel entraînement attribué avec succès (local).',
            'entrainementName' => $entrainement->getObjectifs()->first()?->getName() ?? 'Sans nom',
        ]);
    }
}
