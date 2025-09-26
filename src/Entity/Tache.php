<?php

namespace App\Entity;

use App\Repository\TacheRepository;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity(repositoryClass: TacheRepository::class)]
class Tache
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Entrainement::class, inversedBy: 'taches')]
    #[ORM\JoinColumn(nullable: false)]
    private Entrainement $entrainement;

    #[ORM\Column(length: 50)]
    private string $type;

    #[ORM\Column(type: 'text')]
    private string $consigne;

    #[ORM\Column(type: 'boolean')]
    private bool $completed = false;

    #[ORM\OneToMany(mappedBy: 'tache', targetEntity: Progression::class, cascade: ['persist', 'remove'])]
    private Collection $progressions;

    public function __construct()
    {
        $this->progressions = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function getType(): string { return $this->type; }
    public function setType(string $type): self { $this->type = $type; return $this; }
    public function getConsigne(): string { return $this->consigne; }
    public function setConsigne(string $consigne): self { $this->consigne = $consigne; return $this; }
    public function isCompleted(): bool { return $this->completed; }
    public function setCompleted(bool $completed): self { $this->completed = $completed; return $this; }
    public function getProgressions(): Collection { return $this->progressions; }
}
