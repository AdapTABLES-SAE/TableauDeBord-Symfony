<?php

namespace App\Entity;

use App\Repository\ProgressionRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ProgressionRepository::class)]
class Progression
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: 'integer')]
    private int $score = 0;

    #[ORM\ManyToOne(inversedBy: 'progressions')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Tache $tache = null;

    public function getId(): ?int { return $this->id; }
    public function getScore(): int { return $this->score; }
    public function setScore(int $score): self { $this->score = $score; return $this; }

    public function getTache(): ?Tache { return $this->tache; }
    public function setTache(?Tache $tache): self { $this->tache = $tache; return $this; }
}
