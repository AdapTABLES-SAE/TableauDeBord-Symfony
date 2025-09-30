<?php

namespace App\Entity;

use App\Repository\TacheRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TacheRepository::class)]
class Tache
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 100)]
    private string $type; // ex: "1 élément manquant", "2 éléments manquants"…

    #[ORM\ManyToOne(inversedBy: 'taches')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Niveau $niveau = null;

    #[ORM\OneToMany(mappedBy: 'tache', targetEntity: Progression::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $progressions;

    public function __construct()
    {
        $this->progressions = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function getType(): string { return $this->type; }
    public function setType(string $type): self { $this->type = $type; return $this; }

    public function getNiveau(): ?Niveau { return $this->niveau; }
    public function setNiveau(?Niveau $niveau): self { $this->niveau = $niveau; return $this; }

    public function getEntrainement(): ?Entrainement { return $this->entrainement; }
    public function setEntrainement(?Entrainement $entrainement): self { $this->entrainement = $entrainement; return $this; }

    /** @return Collection<int, Progression> */
    public function getProgressions(): Collection { return $this->progressions; }
    public function addProgression(Progression $progression): self {
        if (!$this->progressions->contains($progression)) {
            $this->progressions[] = $progression;
            $progression->setTache($this);
        }
        return $this;
    }
    public function removeProgression(Progression $progression): self {
        if ($this->progressions->removeElement($progression)) {
            if ($progression->getTache() === $this) {
                $progression->setTache(null);
            }
        }
        return $this;
    }
}
