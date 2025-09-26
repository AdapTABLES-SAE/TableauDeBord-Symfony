<?php

namespace App\Entity;

use App\Repository\EleveRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EleveRepository::class)]
class Eleve
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(length: 50)]
    private string $identifiant;

    #[ORM\Column(length: 100)]
    private string $nom;

    #[ORM\Column(length: 100)]
    private string $prenom;

    #[ORM\ManyToOne(targetEntity: Classe::class, inversedBy: 'eleves')]
    #[ORM\JoinColumn(nullable: false)]
    private Classe $classe;

    public function getId(): ?int { return $this->id; }
    public function getIdentifiant(): string { return $this->identifiant; }
    public function setIdentifiant(string $identifiant): self { $this->identifiant = $identifiant; return $this; }
    public function getNom(): string { return $this->nom; }
    public function setNom(string $nom): self { $this->nom = $nom; return $this; }
    public function getPrenom(): string { return $this->prenom; }
    public function setPrenom(string $prenom): self { $this->prenom = $prenom; return $this; }
    public function getClasse(): Classe { return $this->classe; }
    public function setClasse(Classe $classe): self { $this->classe = $classe; return $this; }
}
