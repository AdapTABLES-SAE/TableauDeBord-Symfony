<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity]
class Classe
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "bigint")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $idClasse;

    #[ORM\Column(length: 255)]
    private string $name;

    /** @var Collection<int, Eleve> */
    #[ORM\OneToMany(
        mappedBy: "classe",
        targetEntity: Eleve::class,
        cascade: ['remove'],
        orphanRemoval: true
    )]
    private Collection $eleves;

    #[ORM\ManyToOne(targetEntity: Enseignant::class, inversedBy: "classes")]
    #[ORM\JoinColumn(onDelete: "CASCADE", nullable: true)]
    private ?Enseignant $enseignant = null;

    public function __construct()
    {
        $this->eleves = new ArrayCollection();
    }

    // ----------------------------------------------------
    // Getters / Setters
    // ----------------------------------------------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getIdClasse(): string
    {
        return $this->idClasse;
    }

    public function setIdClasse(string $idClasse): self
    {
        $this->idClasse = $idClasse;
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

    /** @return Collection<int, Eleve> */
    public function getEleves(): Collection
    {
        return $this->eleves;
    }

    public function addEleve(Eleve $eleve): self
    {
        if (!$this->eleves->contains($eleve)) {
            $this->eleves->add($eleve);
            $eleve->setClasse($this);
        }
        return $this;
    }

    public function removeEleve(Eleve $eleve): self
    {
        if ($this->eleves->removeElement($eleve)) {
            if ($eleve->getClasse() === $this) {
                $eleve->setClasse(null);
            }
        }
        return $this;
    }

    public function getEnseignant(): ?Enseignant
    {
        return $this->enseignant;
    }

    public function setEnseignant(?Enseignant $enseignant): self
    {
        $this->enseignant = $enseignant;
        return $this;
    }
}
