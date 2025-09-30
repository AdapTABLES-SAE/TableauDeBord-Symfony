<?php

namespace App\Entity;

use App\Repository\EleveRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
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

    #[ORM\OneToMany(mappedBy: 'eleve', targetEntity: Objectif::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $objectifs;

    #[ORM\OneToMany(mappedBy: 'eleve', targetEntity: Entrainement::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $entrainements;

    #[ORM\ManyToMany(targetEntity: Equipement::class, inversedBy: 'eleves')]
    private Collection $equipements;

    public function __construct()
    {
        $this->objectifs = new ArrayCollection();
        $this->entrainements = new ArrayCollection();
        $this->equipements = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }

    public function getIdentifiant(): string { return $this->identifiant; }
    public function setIdentifiant(string $identifiant): self { $this->identifiant = $identifiant; return $this; }

    public function getNom(): string { return $this->nom; }
    public function setNom(string $nom): self { $this->nom = $nom; return $this; }

    public function getPrenom(): string { return $this->prenom; }
    public function setPrenom(string $prenom): self { $this->prenom = $prenom; return $this; }

    public function getClasse(): Classe { return $this->classe; }
    public function setClasse(Classe $classe): self { $this->classe = $classe; return $this; }

    /** @return Collection<int, Objectif> */
    public function getObjectifs(): Collection { return $this->objectifs; }
    public function addObjectif(Objectif $objectif): self {
        if (!$this->objectifs->contains($objectif)) {
            $this->objectifs[] = $objectif;
            $objectif->setEleve($this);
        }
        return $this;
    }
    public function removeObjectif(Objectif $objectif): self {
        if ($this->objectifs->removeElement($objectif)) {
            if ($objectif->getEleve() === $this) {
                $objectif->setEleve(null);
            }
        }
        return $this;
    }

    /** @return Collection<int, Entrainement> */
    public function getEntrainements(): Collection { return $this->entrainements; }
    public function addEntrainement(Entrainement $entrainement): self {
        if (!$this->entrainements->contains($entrainement)) {
            $this->entrainements[] = $entrainement;
            $entrainement->setEleve($this);
        }
        return $this;
    }
    public function removeEntrainement(Entrainement $entrainement): self {
        if ($this->entrainements->removeElement($entrainement)) {
            if ($entrainement->getEleve() === $this) {
                $entrainement->setEleve(null);
            }
        }
        return $this;
    }

    /** @return Collection<int, Equipement> */
    public function getEquipements(): Collection { return $this->equipements; }
    public function addEquipement(Equipement $equipement): self {
        if (!$this->equipements->contains($equipement)) {
            $this->equipements[] = $equipement;
        }
        return $this;
    }
    public function removeEquipement(Equipement $equipement): self {
        $this->equipements->removeElement($equipement);
        return $this;
    }
}
