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

    #[ORM\OneToMany(mappedBy: "enseignant", targetEntity: Classe::class)]
    private iterable $classes;

    public function __construct()
    {
        $this->classes = new ArrayCollection();
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

    public function getClasses(): iterable
    {
        return $this->classes;
    }

    public function addClasse(Classe $classe): self
    {
        $this->classes[] = $classe;
        return $this;
    }

    public function removeClasse(Classe $classe): self
    {
        $this->classes = array_filter($this->classes, fn($c) => $c !== $classe);
        return $this;
    }
}
