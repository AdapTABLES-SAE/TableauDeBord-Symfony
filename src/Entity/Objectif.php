<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Objectif
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $objID;

    #[ORM\Column(length: 255)]
    private string $name;

    #[ORM\OneToMany(mappedBy: "objectif", targetEntity: Entrainement::class)]
    private iterable $entrainements;

    #[ORM\OneToMany(mappedBy: "objectif", targetEntity: Prerequis::class)]
    private iterable $prerequis;

    #[ORM\OneToMany(mappedBy: "objectif", targetEntity: Niveau::class)]
    private iterable $niveaux;

    // ----------------------------------------------------
    // Getters / Setters
    // ----------------------------------------------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getObjID(): string
    {
        return $this->objID;
    }

    public function setObjID(string $objID): self
    {
        $this->objID = $objID;
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

    public function getEntrainements(): iterable
    {
        return $this->entrainements;
    }

    public function addEntrainement(Entrainement $entrainement): self
    {
        $this->entrainements[] = $entrainement;
        return $this;
    }

    public function removeEntrainement(Entrainement $entrainement): self
    {
        $this->entrainements = array_filter($this->entrainements, fn($e) => $e !== $entrainement);
        return $this;
    }

    public function getPrerequis(): iterable
    {
        return $this->prerequis;
    }

    public function addPrerequis(Prerequis $prerequis): self
    {
        $this->prerequis[] = $prerequis;
        return $this;
    }

    public function removePrerequis(Prerequis $prerequis): self
    {
        $this->prerequis = array_filter($this->prerequis, fn($p) => $p !== $prerequis);
        return $this;
    }

    public function getNiveaux(): iterable
    {
        return $this->niveaux;
    }

    public function addNiveau(Niveau $niveau): self
    {
        $this->niveaux[] = $niveau;
        return $this;
    }

    public function removeNiveau(Niveau $niveau): self
    {
        $this->niveaux = array_filter($this->niveaux, fn($n) => $n !== $niveau);
        return $this;
    }
}
