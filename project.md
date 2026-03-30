Site web MCP + Agent + app web.

  Automatisation de la gestion de projet.



  On fournis un trello classique (kanban) avec tout le bordel habituel:

  * titre + description de tâche
  * assignation (optionnel)
  * deadline (optionnel)
  * priorité



  Colonnes (fixes):

  * backlog
  * en cours
  * à tester
  * fini



  le Dashboard est multi-tenant:

  1 utilisateur peut créer plusieurs projets, et inviter des users dessus



  Sur un projet, un user est soit "user" soit "admin"



  Un projet peut être connecté optionnellement a plusieurs services (dans les paramètres du projet):

  * GitHub
  * Discord
  * …



  cela va permettre plusieurs cas d'usage sympa tel que:

  * lors d'un commit, détecter si le commit représente une tâche en cours, si mergé dans main,
  considérer la tâche comme fini et changer le status de la carte)
  * a la création d'une branche, détecter selon le nom de la branche la tâche associée, si oui
  déplacer en cours, sinon créer la tâche automatiquement
  * ...



  Pour commencer ces actions automatique se feront depuis claude local (via le mcp qui expose ses
  prompt) ou a défaut via des skills

  A l'avenir on pourra le faire en agentique a partir d'un n8n qui est branché via webhook a github.