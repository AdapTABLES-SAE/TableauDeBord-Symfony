<?php

namespace App\Entity;

use App\Repository\EntrainementRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EntrainementRepository::class)]
class Entrainement
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'entrainements')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Eleve $eleve = null;

    #[ORM\OneToMany(mappedBy: 'entrainement', targetEntity: Tache::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $taches;

    public function __construct()
    {
        $this->taches = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function getEleve(): ?Eleve { return $this->eleve; }
    public function setEleve(?Eleve $eleve): self { $this->eleve = $eleve; return $this; }

    /** @return Collection<int, Tache> */
    public function getTaches(): Collection { return $this->taches; }
    public function addTache(Tache $tache): self {
        if (!$this->taches->contains($tache)) {
            $this->taches[] = $tache;
            $tache->setEntrainement($this);
        }
        return $this;
    }
    public function removeTache(Tache $tache): self {
        if ($this->taches->removeElement($tache)) {
            if ($tache->getEntrainement() === $this) {
                $tache->setEntrainement(null);
            }
        }
        return $this;
    }
}
