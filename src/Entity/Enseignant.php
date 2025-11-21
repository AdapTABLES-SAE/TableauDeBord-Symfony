<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity]
class Enseignant
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $idProf;

    #[ORM\Column(length: 255)]
    private string $name;

    /** @var Collection<int, Classe> */
    #[ORM\OneToMany(
        mappedBy: "enseignant",
        targetEntity: Classe::class,
        cascade: ['remove'],
        orphanRemoval: true
    )]
    private Collection $classes;

    /** @var Collection<int, Entrainement> */
    #[ORM\OneToMany(
        mappedBy: "enseignant",
        targetEntity: Entrainement::class,
        cascade: ['remove'],
        orphanRemoval: true
    )]
    private Collection $entrainements;

    public function __construct()
    {
        $this->classes = new ArrayCollection();
        $this->entrainements = new ArrayCollection();
    }

    // ----------------------------------------------------
    // Getters / Setters
    // ----------------------------------------------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getIdProf(): string
    {
        return $this->idProf;
    }

    public function setIdProf(string $idProf): self
    {
        $this->idProf = $idProf;
        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    /** @return Collection<int, Classe> */
    public function getClasses(): Collection
    {
        return $this->classes;
    }

    public function addClasse(Classe $classe): self
    {
        if (!$this->classes->contains($classe)) {
            $this->classes->add($classe);
            $classe->setEnseignant($this);
        }
        return $this;
    }

    public function removeClasse(Classe $classe): self
    {
        if ($this->classes->removeElement($classe)) {
            if ($classe->getEnseignant() === $this) {
                $classe->setEnseignant(null);
            }
        }
        return $this;
    }

    /** @return Collection<int, Entrainement> */
    public function getEntrainements(): Collection
    {
        return $this->entrainements;
    }

    public function addEntrainement(Entrainement $entrainement): self
    {
        if (!$this->entrainements->contains($entrainement)) {
            $this->entrainements->add($entrainement);
            $entrainement->setEnseignant($this);
        }
        return $this;
    }

    public function removeEntrainement(Entrainement $entrainement): self
    {
        if ($this->entrainements->removeElement($entrainement)) {
            if ($entrainement->getEnseignant() === $this) {
                $entrainement->setEnseignant(null);
            }
        }
        return $this;
    }
}
