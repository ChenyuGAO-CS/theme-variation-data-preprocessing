# Making violin plot for ratings.
library("ggpubr")

p <- read.csv("all_violin_plot.csv")
p$Category <- factor(p$Category, levels = c(" MAMA", " FaTr"," MuTr", " VaTr", " Hu"))
p <- ggviolin(p, x = "Category", y = "Rating", orientation = "horiz")
p <- add_summary(p, fun = "median_q1q3", size = 0.3)
p <- facet(p +
             theme_pubclean() +
             geom_hline(yintercept = 2, linetype = "dotted", size = 0.5, alpha = 0.4) +
             geom_hline(yintercept = 4, linetype = "dotted", size = 0.5, alpha = 0.8) +
             geom_hline(yintercept = 6, linetype = "dotted", size = 0.5, alpha = 0.4) +
             scale_y_discrete(limits = c("1", "2", "3", "4", "5", "6", "7")),
           scales = "free",
           panel.labs = list(Aspect = c("Vs", "Sc", "Si", "Cr", "Mq", "Ws", "Turing"), Part = c("POP909-TV", "VGMIDI-TV")),
           facet.by = c("Part", "Aspect"))
p
ggarrange(p) %>%
  ggexport(width = 4800, height = 1800, res = 400, filename = "ratings.png")